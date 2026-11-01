import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { tokens, setSessionExpiredHandler } from '../api/client'
import { usersApi } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    // 'loading' while we validate a stored session on first paint, so guarded routes don't flash a redirect.
    const [status, setStatus] = useState(tokens.access || tokens.refresh ? 'loading' : 'ready')
    const [expired, setExpired] = useState(false)
    const [sessionError, setSessionError] = useState(false)

    const validateSession = useCallback(async (signal) => {
        setStatus('loading')
        setSessionError(false)
        try {
            const r = await usersApi.me(signal)
            if (!signal?.aborted) {
                setUser(r.user)
                setExpired(false)
            }
        } catch (err) {
            if (signal?.aborted || err?.code === 'ERR_CANCELED') return
            const httpStatus = err?.response?.status
            if (httpStatus === 401 || httpStatus === 403) {
                tokens.clear()
                setUser(null)
            } else {
                setSessionError(true)
            }
        } finally {
            if (!signal?.aborted) setStatus('ready')
        }
    }, [])

    useEffect(() => {
        setSessionExpiredHandler(() => {
            setUser(null)
            setExpired(true)
            setSessionError(false)
        })
        if (!tokens.access && !tokens.refresh) return
        const controller = new AbortController()
        validateSession(controller.signal)
        return () => controller.abort()
    }, [validateSession])

    const login = useCallback(async (credentials) => {
        const res = await usersApi.login(credentials)
        tokens.set(res)
        setUser(res.user)
        setExpired(false)
        setSessionError(false)
        return res.user
    }, [])

    // The API signup returns no tokens, so sign straight in afterwards for a seamless first run.
    const register = useCallback(
        async ({ username, email, password, role }) => {
            await usersApi.signup({ username, email, password, role })
            return login({ username, password })
        },
        [login],
    )

    const logout = useCallback(async () => {
        const refresh = tokens.refresh
        tokens.clear()
        setUser(null)
        setSessionError(false)
        if (refresh) usersApi.logout(refresh).catch(() => {})
    }, [])

    const refreshUser = useCallback(async () => {
        const r = await usersApi.me()
        setUser(r.user)
        return r.user
    }, [])

    const value = useMemo(
        () => ({
            user,
            status,
            expired,
            sessionError,
            retrySession: () => validateSession(),
            dismissExpired: () => setExpired(false),
            isOwner: ['Venue Owner', 'Admin', 'Super Admin'].includes(user?.role),
            isAdmin: user?.role === 'Admin' || user?.role === 'Super Admin',
            isSuperAdmin: user?.role === 'Super Admin',
            login,
            register,
            logout,
            refreshUser,
            setUser,
        }),
        [user, status, expired, sessionError, login, register, logout, refreshUser, validateSession],
    )
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
    return ctx
}
