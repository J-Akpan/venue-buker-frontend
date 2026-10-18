import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usersApi } from '../api'
import { parseError } from '../api/client'
import { Alert, Field } from '../components/ui'
import { useToast } from '../components/Toast'
import { useTitle } from '../lib/hooks'
import { passwordProblem } from './Register'

export default function ForgotPassword() {
    useTitle('Reset password')
    const nav = useNavigate()
    const toast = useToast()
    const [step, setStep] = useState('request')
    const [email, setEmail] = useState('')
    const [form, setForm] = useState({ otp: '', newPassword: '', confirmPassword: '' })
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const request = async (e) => {
        e.preventDefault()
        setError('')
        setBusy(true)
        try {
            await usersApi.forgotPassword(email.trim())
            setStep('reset')
        } catch (err) {
            setError(parseError(err).message)
        } finally {
            setBusy(false)
        }
    }

    const reset = async (e) => {
        e.preventDefault()
        const v = {}
        if (!/^\d{6}$/.test(form.otp)) v.otp = 'Enter the 6-digit code from your email'
        const pw = passwordProblem(form.newPassword)
        if (pw) v.newPassword = pw
        if (form.confirmPassword !== form.newPassword) v.confirmPassword = 'Passwords do not match'
        setErrors(v)
        setError('')
        if (Object.keys(v).length) return
        setBusy(true)
        try {
            await usersApi.resetPassword({ email: email.trim(), ...form })
            toast.success('Password updated. Please sign in.')
            nav('/login', { replace: true })
        } catch (err) {
            const p = parseError(err)
            setErrors(p.fields)
            setError(p.message)
            setBusy(false)
        }
    }

    return (
        <div className="auth-page">
            {step === 'request' ? (
                <form className="card auth-card" onSubmit={request}>
                    <h1>Reset your password</h1>
                    <p className="muted">Enter your account email and we'll send you a 6-digit code.</p>
                    <Alert>{error}</Alert>
                    <Field label="Email">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus required />
                    </Field>
                    <button className="btn btn-block" disabled={busy || !email}>{busy ? 'Sending…' : 'Send code'}</button>
                    <p className="muted center small"><Link to="/login">Back to sign in</Link></p>
                </form>
            ) : (
                <form className="card auth-card" onSubmit={reset} noValidate>
                    <h1>Enter your code</h1>
                    <Alert type="info">If {email} is registered, a code is on its way. It expires in 10 minutes.</Alert>
                    <Alert>{error}</Alert>
                    <Field label="6-digit code" error={errors.otp}>
                        <input value={form.otp} onChange={set('otp')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus />
                    </Field>
                    <Field label="New password" error={errors.newPassword}>
                        <input type="password" value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" maxLength={72} />
                    </Field>
                    <Field label="Confirm new password" error={errors.confirmPassword}>
                        <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" maxLength={72} />
                    </Field>
                    <button className="btn btn-block" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
                    <button type="button" className="btn btn-ghost btn-block" onClick={() => setStep('request')}>Use a different email</button>
                </form>
            )}
        </div>
    )
}
