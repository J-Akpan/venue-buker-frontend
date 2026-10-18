import React, { useState } from 'react'
import { adminStaffApi } from '../api'
import { parseError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime } from '../lib/format'
import { Alert, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'

function StaffForm({ onClose, onSaved }) {
    const toast = useToast()
    const [form, setForm] = useState({ username: '', email: '', password: '', firstname: '', lastname: '' })
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const submit = async (e) => {
        e.preventDefault()
        const v = {}
        if (!/^[A-Za-z0-9]{3,30}$/.test(form.username)) v.username = '3–30 letters or numbers'
        if (!/^\S+@\S+\.\S+$/.test(form.email)) v.email = 'Enter a valid email'
        if (form.password.length < 8) v.password = 'At least 8 characters, with a letter, a number and a symbol'
        setErrors(v)
        setError('')
        if (Object.keys(v).length) return
        setBusy(true)
        try {
            const body = { username: form.username, email: form.email, password: form.password }
            if (form.firstname.trim()) body.firstname = form.firstname.trim()
            if (form.lastname.trim()) body.lastname = form.lastname.trim()
            await adminStaffApi.create(body)
            toast.success('Staff account created.')
            onSaved()
        } catch (err) {
            const p = parseError(err)
            setErrors(p.fields)
            setError(Object.keys(p.fields).length ? '' : p.message)
            setBusy(false)
        }
    }

    return (
        <Modal
            open
            title="Add an admin"
            onClose={busy ? () => {} : onClose}
            footer={
                <>
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button type="submit" form="staff-form" className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create admin'}</button>
                </>
            }
        >
            <form id="staff-form" onSubmit={submit} noValidate>
                {error && <Alert>{error}</Alert>}
                <Field label="Username" error={errors.username}><input value={form.username} onChange={set('username')} autoComplete="off" /></Field>
                <Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={set('email')} autoComplete="off" /></Field>
                <Field label="Temporary password" error={errors.password}><input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" /></Field>
                <Field label="First name (optional)" error={errors.firstname}><input value={form.firstname} onChange={set('firstname')} /></Field>
                <Field label="Last name (optional)" error={errors.lastname}><input value={form.lastname} onChange={set('lastname')} /></Field>
            </form>
        </Modal>
    )
}

export default function AdminStaff() {
    useTitle('Staff')
    const toast = useToast()
    const { user } = useAuth()
    const [page, setPage] = useState(1)
    const { data, error, loading, reload } = useAsync(() => adminStaffApi.list({ page, limit: 25 }), [page])
    const [creating, setCreating] = useState(false)
    const [removing, setRemoving] = useState(null)
    const [busy, setBusy] = useState(false)

    const remove = async () => {
        setBusy(true)
        try {
            await adminStaffApi.remove(removing.userId)
            toast.success(`${removing.username} is now a regular user.`)
            setRemoving(null)
            reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="container section">
            <PageHeader
                title="Staff"
                subtitle={data ? `${data.meta.total} staff accounts` : undefined}
                actions={<button className="btn" onClick={() => setCreating(true)}>Add admin</button>}
            />
            {error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : loading && !data ? (
                <Spinner />
            ) : data.data.length === 0 ? (
                <EmptyState title="No staff yet" />
            ) : (
                <>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Added</th><th /></tr></thead>
                            <tbody>
                                {data.data.map((u) => (
                                    <tr key={u.userId}>
                                        <td><strong>{u.username}</strong></td>
                                        <td>{u.email}</td>
                                        <td><span className="chip">{u.role}</span></td>
                                        <td>{dateTime(u.createdAt)}</td>
                                        <td>
                                            {u.role === 'Admin' && u.userId !== user?.userId && (
                                                <button className="btn btn-ghost btn-sm danger-text" onClick={() => setRemoving(u)}>Remove</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={data.meta} onPage={setPage} />
                </>
            )}
            {creating && <StaffForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload() }} />}
            <ConfirmDialog
                open={!!removing}
                danger
                busy={busy}
                title="Remove admin access?"
                confirmLabel="Remove"
                message={`${removing?.username} will become a regular user and be signed out everywhere.`}
                onConfirm={remove}
                onClose={() => setRemoving(null)}
            />
        </div>
    )
}
