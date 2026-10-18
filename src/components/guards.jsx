import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Spinner } from './ui'

/** Requires sign-in; optionally a role (staff always pass owner checks, Super Admin passes everything). */
export function RequireAuth({ role }) {
    const { user, status } = useAuth()
    const location = useLocation()
    if (status === 'loading') return <Spinner label="Checking your session…" />
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    if (role === 'Venue Owner' && !['Venue Owner', 'Admin', 'Super Admin'].includes(user.role)) return <Navigate to="/" replace />
    if (role === 'Admin' && !['Admin', 'Super Admin'].includes(user.role)) return <Navigate to="/" replace />
    if (role === 'Super Admin' && user.role !== 'Super Admin') return <Navigate to="/" replace />
    return <Outlet />
}

/** For login/register: signed-in users go straight to where they were headed. */
export function GuestOnly() {
    const { user, status } = useAuth()
    const location = useLocation()
    if (status === 'loading') return <Spinner />
    if (user) return <Navigate to={location.state?.from || '/'} replace />
    return <Outlet />
}
