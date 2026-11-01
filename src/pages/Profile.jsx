import React, { useState } from 'react'
import { usersApi } from '../api'
import { parseError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { Alert, ConfirmDialog, ErrorState, Field, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { dateTime, initials } from '../lib/format'
import { useAsync, useTitle } from '../lib/hooks'
import { passwordProblem } from './Register'

function PrivacySettings() {
    const { user } = useAuth()
    const toast = useToast()
    const [busy, setBusy] = useState('')
    const [confirmDeletion, setConfirmDeletion] = useState(false)
    const requests = useAsync((signal) => usersApi.privacyRequests(signal), [user.userId])
    const rows = requests.data?.data || []
    const activeDeletion = rows.some((request) => request.requestType === 'deletion' && ['open', 'in_review'].includes(request.status))
    const staffAccount = ['Admin', 'Super Admin'].includes(user.role)

    const downloadExport = async () => {
        setBusy('export')
        try {
            const result = await usersApi.exportPersonalData()
            const json = JSON.stringify(result.data, null, 2)
            const objectUrl = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
            const anchor = document.createElement('a')
            anchor.href = objectUrl
            anchor.download = `venbuk-data-export-${new Date().toISOString().slice(0, 10)}.json`
            document.body.append(anchor)
            anchor.click()
            anchor.remove()
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
            toast.success('Your data export has downloaded.')
            requests.reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setBusy('')
        }
    }

    const requestDeletion = async () => {
        setBusy('deletion')
        try {
            const { replayed } = await usersApi.requestDeletion()
            setConfirmDeletion(false)
            toast.success(replayed
                ? 'You already have an active deletion request.'
                : 'Your deletion request was submitted for review.')
            requests.reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setBusy('')
        }
    }

    return (
        <section className="card privacy-settings">
            <h2>Privacy and your data</h2>
            <p className="muted">Download a JSON copy of your account data or request account deletion. Deletion is reviewed by an administrator; your account stays active until the request is completed.</p>
            <div className="row-gap">
                <button type="button" className="btn btn-ghost" disabled={busy !== ''} onClick={downloadExport}>
                    {busy === 'export' ? 'Preparing export…' : 'Download my data'}
                </button>
                {!staffAccount && (
                    <button type="button" className="btn btn-ghost danger-text" disabled={busy !== '' || activeDeletion} onClick={() => setConfirmDeletion(true)}>
                        {activeDeletion ? 'Deletion request pending' : 'Request account deletion'}
                    </button>
                )}
            </div>
            {!staffAccount && <Alert type="info">If approved, deletion anonymizes your profile, hides your owned venues, cancels active bookings and processes applicable refunds. Payout-provider records may need separate handling.</Alert>}

            <div className="privacy-request-history">
                <h3>Your privacy requests</h3>
                {requests.error ? <ErrorState error={requests.error} onRetry={requests.reload} /> : requests.loading && !requests.data ? <Spinner /> : rows.length === 0 ? (
                    <p className="muted small">No privacy requests yet.</p>
                ) : (
                    <ul className="list">
                        {rows.map((request) => (
                            <li className="card booking-row" key={request.requestId}>
                                <div className="booking-main">
                                    <strong>{request.requestType === 'deletion' ? 'Account deletion' : 'Data export'}</strong>
                                    <span className="muted small">Submitted {dateTime(request.createdAt)}</span>
                                    {request.note && <span className="muted small">{request.note}</span>}
                                </div>
                                <div className="booking-side"><StatusBadge status={request.status} /></div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ConfirmDialog
                open={confirmDeletion}
                danger
                busy={busy === 'deletion'}
                title="Request account deletion?"
                confirmLabel="Submit deletion request"
                message="This sends a request to an administrator. Your account remains active until the request is reviewed and completed."
                onConfirm={requestDeletion}
                onClose={() => setConfirmDeletion(false)}
            />
        </section>
    )
}

function ProfileForm() {
    const { user, setUser } = useAuth()
    const toast = useToast()
    const [form, setForm] = useState({
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        contact: user.contact || '',
        address: user.address || '',
        gender: user.gender || '',
        whatsappOptIn: Boolean(user.whatsappOptIn),
    })
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const submit = async (e) => {
        e.preventDefault()
        setError('')
        // The API rejects empty strings and requires at least one field; send only what is filled in.
        const body = Object.fromEntries(Object.entries(form)
            .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
            .filter(([, v]) => typeof v === 'boolean' || v))
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
            <label className="profile-consent">
                <input type="checkbox" checked={form.whatsappOptIn} onChange={(e) => setForm((current) => ({ ...current, whatsappOptIn: e.target.checked }))} />
                <span><strong>WhatsApp updates</strong><small className="muted">Allow booking updates and service messages on WhatsApp. You can change this any time.</small></span>
            </label>
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
                <PrivacySettings />
            </div>
        </div>
    )
}
