import axios from 'axios'

const ACCESS_KEY = 'vb.access'
const REFRESH_KEY = 'vb.refresh'

const safe = (fn) => {
    try { return fn() } catch { return null }
}

export const tokens = {
    get access() { return safe(() => localStorage.getItem(ACCESS_KEY)) },
    get refresh() { return safe(() => localStorage.getItem(REFRESH_KEY)) },
    set({ accessToken, refreshToken }) {
        safe(() => {
            localStorage.setItem(ACCESS_KEY, accessToken)
            localStorage.setItem(REFRESH_KEY, refreshToken)
        })
    },
    clear() {
        safe(() => {
            localStorage.removeItem(ACCESS_KEY)
            localStorage.removeItem(REFRESH_KEY)
        })
    },
}

const baseURL = `${import.meta.env.VITE_API_URL || ''}/api/v1`

export const http = axios.create({ baseURL, timeout: 20000 })

/** Set by AuthProvider: called when the session can no longer be recovered. */
let onSessionExpired = () => {}
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn }

http.interceptors.request.use((config) => {
    const token = tokens.access
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// One refresh at a time: the backend rotates refresh tokens and treats re-use as theft (it revokes
// every session), so parallel 401s must share a single refresh call.
let refreshing = null
const refreshTokens = () => {
    refreshing ??= axios
        .post(`${baseURL}/users/refresh`, { refreshToken: tokens.refresh }, { timeout: 20000 })
        .then((res) => {
            tokens.set(res.data)
            return res.data.accessToken
        })
        .finally(() => { refreshing = null })
    return refreshing
}

const AUTH_PATHS = ['/users/login', '/users/signup', '/users/refresh', '/users/logout', '/users/forgot-password', '/users/reset-password']

http.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config
        const isAuthCall = AUTH_PATHS.some((p) => original?.url?.startsWith(p))
        if (error.response?.status === 401 && original && !original._retried && !isAuthCall && tokens.refresh) {
            original._retried = true
            try {
                const access = await refreshTokens()
                original.headers.Authorization = `Bearer ${access}`
                return http(original)
            } catch {
                tokens.clear()
                onSessionExpired()
            }
        }
        return Promise.reject(error)
    },
)

/**
 * Turns any failure into { message, code, status, fields, requestId } for the UI.
 * `fields` maps request field names to messages (from the API's validation `details`).
 */
export const parseError = (err) => {
    if (err?.response) {
        const e = err.response.data?.error
        const fields = {}
        if (Array.isArray(e?.details)) {
            for (const d of e.details) if (d?.field && !fields[d.field]) fields[d.field] = d.message
        }
        const status = err.response.status
        let message = e?.message
        if (!message) message = status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed.'
        if (status === 429) message = 'Too many attempts. Please wait a moment and try again.'
        else if (e?.message === 'Validation failed' && Object.keys(fields).length) message = Object.values(fields)[0]
        return { message, code: e?.code || 'ERROR', status, fields, requestId: e?.requestId }
    }
    if (err?.code === 'ECONNABORTED') return { message: 'The request timed out. Check your connection and try again.', code: 'TIMEOUT', status: 0, fields: {} }
    if (err?.request) return { message: 'Cannot reach the server. Check your connection and try again.', code: 'NETWORK', status: 0, fields: {} }
    return { message: err?.message || 'Unexpected error.', code: 'ERROR', status: 0, fields: {} }
}
