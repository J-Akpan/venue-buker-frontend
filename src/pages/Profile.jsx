import React, { useState } from 'react'
import { usersApi } from '../api'
import { parseError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { Alert, Field, PageHeader } from '../components/ui'
import { useTitle } from '../lib/hooks'
import { initials } from '../lib/format'
import { passwordProblem } from './Register'

function ProfileForm() {
    const { user, setUser } = useAuth()
    const toast = useToast()
    const [form, setForm] = useState({
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        contact: user.contact || '',
        address: user.address || '',
        gender: user.gender || '',
    })
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        // The API rejects empty strings and requires at least one field; send only what is filled in.
        const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v))
        if (!Object.keys(body).length) return setError('Fill in at least one field')
        setBusy(true)
        try {
            const res = await usersApi.updateMe(body)
            setUser(res.user)
            setErrors({})
            toast.success('Profile saved')
        } catch (err) {
            const p = parseError(err)
            setErrors(p.fields)
            setError(p.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <form className="card" onSubmit={submit}>
            <h2>Personal details</h2>
            <Alert>{error}</Alert>
            <div className="form-grid">
                <Field label="First name" error={errors.firstname}><input value={form.firstname} onChange={set('firstname')} maxLength={80} autoComplete="given-name" /></Field>
                <Field label="Last name" error={errors.lastname}><input value={form.lastname} onChange={set('lastname')} maxLength={80} autoComplete="family-name" /></Field>
                <Field label="Phone" error={errors.contact}><input type="tel" value={form.contact} onChange={set('contact')} maxLength={32} autoComplete="tel" /></Field>
                <Field label="Gender" error={errors.gender}>
                    <select value={form.gender} onChange={set('gender')}>
                        <option value="">Prefer not to say</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                    </select>
                </Field>
            </div>
            <Field label="Address" error={errors.address}><input value={form.address} onChange={set('address')} maxLength={255} autoComplete="street-address" /></Field>
            <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
    )
}

function PasswordForm() {
    const { logout } = useAuth()
    const toast = useToast()
    const empty = { oldPassword: '', newPassword: '', confirmPassword: '' }
    const [form, setForm] = useState(empty)
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const submit = async (e) => {
        e.preventDefault()
        const v = {}
        if (!form.oldPassword) v.oldPassword = 'Enter your current password'
        const pw = passwordProblem(form.newPassword)
        if (pw) v.newPassword = pw
        if (form.confirmPassword !== form.newPassword) v.confirmPassword = 'Passwords do not match'
        setErrors(v)
        setError('')
        if (Object.keys(v).length) return
        setBusy(true)
        try {
            await usersApi.changePassword(form)
            // The server revokes every refresh token (all sessions), so this device must sign in again too.
            toast.success('Password updated. Please sign in again.')
            await logout()
        } catch (err) {
            const p = parseError(err)
            setErrors(p.fields)
            setError(p.message)
            setBusy(false)
        }
    }

    return (
        <form className="card" onSubmit={submit} noValidate>
            <h2>Change password</h2>
            <p className="muted small">You'll be signed out of all devices afterwards.</p>
            <Alert>{error}</Alert>
            <Field label="Current password" error={errors.oldPassword}><input type="password" value={form.oldPassword} onChange={set('oldPassword')} autoComplete="current-password" maxLength={72} /></Field>
            <Field label="New password" error={errors.newPassword}><input type="password" value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" maxLength={72} /></Field>
            <Field label="Confirm new password" error={errors.confirmPassword}><input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" maxLength={72} /></Field>
            <button className="btn" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
        </form>
    )
}

export default function Profile() {
    useTitle('Profile')
    const { user } = useAuth()
    return (
        <div className="container section narrow">
            <PageHeader title="Your account" />
            <div className="card profile-head">
                <span className="avatar avatar-lg" aria-hidden>{initials(user)}</span>
                <div>
                    <strong>{user.username}</strong>
                    <div className="muted">{user.email}</div>
                    <span className="chip">{user.role}</span>
                </div>
            </div>
            <div className="stack">
                <ProfileForm />
                <PasswordForm />
            </div>
        </div>
    )
}
