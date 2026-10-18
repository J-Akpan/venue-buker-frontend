import React, { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { parseError } from '../api/client'
import { Alert, Field } from '../components/ui'
import { useTitle } from '../lib/hooks'

// Mirrors the API rule: 8-72 chars with a letter, a number and a special character.
export const passwordProblem = (pw) => {
    if (pw.length < 8) return 'Use at least 8 characters'
    if (pw.length > 72) return 'Use at most 72 characters'
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw) || !/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(pw)) return 'Include a letter, a number and a special character'
    return ''
}

export default function Register() {
    useTitle('Create account')
    const { register } = useAuth()
    const location = useLocation()
    const [params] = useSearchParams()
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        role: params.get('role') === 'owner' ? 'Venue Owner' : 'User',
    })
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const validate = () => {
        const e = {}
        if (!/^[a-zA-Z0-9]{3,30}$/.test(form.username)) e.username = '3–30 letters or numbers, no spaces'
        if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address'
        const pw = passwordProblem(form.password)
        if (pw) e.password = pw
        return e
    }

    const submit = async (ev) => {
        ev.preventDefault()
        const v = validate()
        setErrors(v)
        setError('')
        if (Object.keys(v).length) return
        setBusy(true)
        try {
            await register({ ...form, username: form.username.trim(), email: form.email.trim() })
        } catch (err) {
            const p = parseError(err)
            setErrors(p.fields)
            setError(p.message)
            setBusy(false)
        }
    }

    return (
        <div className="auth-page">
            <form className="card auth-card" onSubmit={submit} noValidate>
                <h1>Create your account</h1>
                <p className="muted">Book venues in minutes, or list your own.</p>
                <Alert>{error}</Alert>

                <fieldset className="role-pick">
                    <legend>I want to</legend>
                    {[
                        ['User', 'Book venues'],
                        ['Venue Owner', 'List my venue'],
                    ].map(([value, label]) => (
                        <label key={value} className={form.role === value ? 'on' : ''}>
                            <input type="radio" name="role" value={value} checked={form.role === value} onChange={set('role')} />
                            {label}
                        </label>
                    ))}
                </fieldset>

                <Field label="Username" error={errors.username}>
                    <input value={form.username} onChange={set('username')} autoComplete="username" maxLength={30} required />
                </Field>
                <Field label="Email" error={errors.email}>
                    <input type="email" value={form.email} onChange={set('email')} autoComplete="email" maxLength={254} required />
                </Field>
                <Field label="Password" error={errors.password} hint="8+ characters with a letter, a number and a special character">
                    <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" maxLength={72} required />
                </Field>
                <button className="btn btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
                <p className="muted center small">
                    Already registered? <Link to="/login" state={location.state}>Sign in</Link>
                </p>
            </form>
        </div>
    )
}
