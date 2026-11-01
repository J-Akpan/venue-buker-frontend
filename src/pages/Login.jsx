import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { parseError } from '../api/client'
import { Alert, Field } from '../components/ui'
import { useTitle } from '../lib/hooks'

export default function Login() {
    useTitle('Sign in')
    const { login } = useAuth()
    const location = useLocation()
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        setBusy(true)
        try {
            const id = identifier.trim()
            // The API takes exactly one of username / email.
            await login({ ...(id.includes('@') ? { email: id } : { username: id }), password })
            // GuestOnly redirects to the page the user originally wanted.
        } catch (err) {
            setError(parseError(err).message)
            setBusy(false)
        }
    }

    return (
        <div className="auth-page">
            <form className="card auth-card" onSubmit={submit} noValidate>
                <h1>Welcome back</h1>
                <p className="muted">Sign in to manage your bookings.</p>
                {location.state?.from && <Alert type="info">Please sign in to continue.</Alert>}
                <Alert>{error}</Alert>
                <Field label="Email or username">
                    <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required maxLength={254} />
                </Field>
                <Field label="Password">
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required maxLength={72} />
                </Field>
                <div className="row-between">
                    <span />
                    <Link to="/forgot-password" className="small">Forgot password?</Link>
                </div>
                <button className="btn btn-block" disabled={busy || !identifier.trim() || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
                <p className="muted center small">
                    New to VenBuk? <Link to="/register" state={location.state}>Create an account</Link>
                </p>
            </form>
        </div>
    )
}
