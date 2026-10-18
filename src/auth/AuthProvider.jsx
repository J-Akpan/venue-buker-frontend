import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { tokens, setSessionExpiredHandler } from '../api/client'
import { usersApi } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    // 'loading' while we validate a stored session on first paint, so guarded routes don't flash a redirect.
    const [status, setStatus] = useState(tokens.access || tokens.refresh ? 'loading' : 'ready')
    const [expired, setExpired] = useState(false)

    useEffect(() => {
        setSessionExpiredHandler(() => {
            setUser(null)
            setExpired(true)
        })
        if (status !== 'loading') return
        usersApi
            .me()
            .then((r) => setUser(r.user))
            .catch(() => tokens.clear())
            .finally(() => setStatus('ready'))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const login = useCallback(async (credentials) => {
        const res = await usersApi.login(credentials)
        tokens.set(res)
        setUser(res.user)
        setExpired(false)
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
        [user, status, expired, login, register, logout, refreshUser],
    )
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
    return ctx
}
