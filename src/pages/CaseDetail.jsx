import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminCasesApi, supportApi } from '../api'
import { parseError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime } from '../lib/format'
import { Alert, BackLink, ErrorState, Field, Modal, Spinner, StatusBadge } from '../components/ui'
import { useToast } from '../components/Toast'

const OPEN = ['open', 'in_review']

function ResolveModal({ caseData, isSuperAdmin, onClose, onDone }) {
    const toast = useToast()
    const [form, setForm] = useState({ outcome: 'resolved', resolution: '', bookingAction: 'none' })
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const submit = async (e) => {
        e.preventDefault()
        if (form.resolution.trim().length < 5) return setErrors({ resolution: 'At least 5 characters' })
        setErrors({})
        setError('')
        setBusy(true)
        try {
            await adminCasesApi.resolve(caseData.caseId, { ...form, resolution: form.resolution.trim() })
            toast.success('Case closed.')
            onDone()
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
            title="Close case"
            onClose={busy ? () => {} : onClose}
            footer={
                <>
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button type="submit" form="resolve-form" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Close case'}</button>
                </>
            }
        >
            <form id="resolve-form" onSubmit={submit} noValidate>
                {error && <Alert>{error}</Alert>}
                <Field label="Outcome" error={errors.outcome}>
                    <select value={form.outcome} onChange={set('outcome')}>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </Field>
                <Field label="Resolution (shown to the person who raised it)" error={errors.resolution}>
                    <textarea rows={4} value={form.resolution} onChange={set('resolution')} maxLength={5000} />
                </Field>
                {isSuperAdmin && caseData.bookingId && (
                    <Field label="Booking action" error={errors.bookingAction} hint="Cancelling refunds the payment if one was taken.">
                        <select value={form.bookingAction} onChange={set('bookingAction')}>
                            <option value="none">No change to the booking</option>
                            <option value="cancel_and_refund">Cancel booking and refund</option>
                        </select>
                    </Field>
                )}
            </form>
        </Modal>
    )
}

export default function CaseDetail({ staff = false }) {
    const { caseId } = useParams()
    const { user, isSuperAdmin } = useAuth()
    const toast = useToast()
    useTitle('Case')
    const { data, error, loading, reload } = useAsync(
        (signal) => (staff ? adminCasesApi.get(caseId, signal) : supportApi.get(caseId, signal)),
        [caseId, staff],
    )
    const [resolving, setResolving] = useState(false)
    const [busy, setBusy] = useState(false)
    const back = staff ? '/admin/cases' : '/support'

    const assignToMe = async () => {
        setBusy(true)
        try {
            await adminCasesApi.assign(caseId)
            toast.success('Case assigned to you.')
            reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setBusy(false)
        }
    }

    if (error) return <div className="container section"><BackLink to={back}>Back</BackLink><ErrorState error={error} onRetry={reload} /></div>
    if (loading && !data) return <Spinner />

    const c = data.case
    const isOpen = OPEN.includes(c.status)
    const mine = c.assignedTo === user?.userId
    const canResolve = staff && isOpen && (isSuperAdmin || mine)

    return (
        <div className="container section">
            <BackLink to={back}>{staff ? 'All cases' : 'My cases'}</BackLink>
            <div className="card" style={{ padding: 20 }}>
                <div className="row-gap">
                    <h1 style={{ margin: 0 }}>{c.subject}</h1>
                    <StatusBadge status={c.status} />
                    <span className="chip">{c.type}</span>
                </div>
                <p className="muted small">Opened {dateTime(c.createdAt)}{c.resolvedAt && ` · Closed ${dateTime(c.resolvedAt)}`}</p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{c.description}</p>
                {c.bookingId && <p><Link to={`/bookings/${c.bookingId}`}>View related booking</Link></p>}
                {c.venueId && <p><Link to={`/venues/${c.venueId}`}>View related venue</Link></p>}
                {c.resolution && (
                    <Alert type="success">
                        <strong>Resolution:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{c.resolution}</span>
                        {c.bookingAction === 'cancel_and_refund' && <div className="small">The booking was cancelled and refunded.</div>}
                    </Alert>
                )}
                {staff && isOpen && (
                    <div className="row-gap" style={{ marginTop: 12 }}>
                        {!mine && <button className="btn btn-ghost" disabled={busy} onClick={assignToMe}>{c.assignedTo ? 'Take over' : 'Assign to me'}</button>}
                        {canResolve && <button className="btn" onClick={() => setResolving(true)}>Close case</button>}
                        {c.assignedTo && <span className="muted small">{mine ? 'Assigned to you' : 'Assigned to another staff member'}</span>}
                    </div>
                )}
            </div>
            {resolving && <ResolveModal caseData={c} isSuperAdmin={isSuperAdmin} onClose={() => setResolving(false)} onDone={() => { setResolving(false); reload() }} />}
        </div>
    )
}
