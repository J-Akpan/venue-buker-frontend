import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { bookingsApi, supportApi } from '../api'
import { parseError } from '../api/client'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime } from '../lib/format'
import { Alert, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, Spinner, StatusBadge } from '../components/ui'
import { useToast } from '../components/Toast'

function NewCaseForm({ initialBookingId, onClose, onSaved }) {
    const toast = useToast()
    const [form, setForm] = useState({ type: initialBookingId ? 'dispute' : 'complaint', subject: '', description: '', bookingId: initialBookingId || '' })
    const [bookings, setBookings] = useState([])
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    useEffect(() => {
        const controller = new AbortController()
        bookingsApi.mine({ page: 1, limit: 50 }, controller.signal)
            .then((r) => { if (!controller.signal.aborted) setBookings(r.data) })
            .catch(() => {})
        return () => controller.abort()
    }, [])

    const submit = async (e) => {
        e.preventDefault()
        const v = {}
        if (form.subject.trim().length < 3) v.subject = 'At least 3 characters'
        if (form.description.trim().length < 10) v.description = 'Please give at least 10 characters of detail'
        if (form.type === 'dispute' && !form.bookingId.trim()) v.bookingId = 'A dispute must reference a booking'
        setErrors(v)
        setError('')
        if (Object.keys(v).length) return
        setBusy(true)
        try {
            const body = { type: form.type, subject: form.subject.trim(), description: form.description.trim() }
            if (form.bookingId.trim()) body.bookingId = form.bookingId.trim()
            const { case: created } = await supportApi.create(body)
            toast.success('Your case has been submitted. We will review it shortly.')
            onSaved(created)
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
            title="Raise a case"
            onClose={busy ? () => {} : onClose}
            footer={
                <>
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button type="submit" form="case-form" className="btn" disabled={busy}>{busy ? 'Submitting…' : 'Submit case'}</button>
                </>
            }
        >
            <form id="case-form" onSubmit={submit} noValidate>
                {error && <Alert>{error}</Alert>}
                <Field label="Type" error={errors.type}>
                    <select value={form.type} onChange={set('type')}>
                        <option value="complaint">Complaint</option>
                        <option value="dispute">Booking dispute</option>
                    </select>
                </Field>
                <Field label="Booking" error={errors.bookingId} hint={form.type === 'dispute' ? 'Required for disputes. Pick one of yours or paste a booking ID.' : 'Optional.'}>
                    <input value={form.bookingId} onChange={set('bookingId')} list="my-bookings" placeholder="Booking ID" />
                </Field>
                <datalist id="my-bookings">
                    {bookings.map((b) => <option key={b.bookingId} value={b.bookingId}>{b.venue?.name} · {dateTime(b.startsAt)}</option>)}
                </datalist>
                <Field label="Subject" error={errors.subject}>
                    <input value={form.subject} onChange={set('subject')} maxLength={160} />
                </Field>
                <Field label="What happened?" error={errors.description}>
                    <textarea rows={5} value={form.description} onChange={set('description')} maxLength={5000} />
                </Field>
            </form>
        </Modal>
    )
}

export default function Support() {
    useTitle('Support')
    const [params, setParams] = useSearchParams()
    const page = Number(params.get('page')) || 1
    const [creating, setCreating] = useState(!!params.get('bookingId'))
    const { data, error, loading, reload } = useAsync((signal) => supportApi.mine({ page, limit: 10 }, signal), [page])

    const closeForm = () => {
        setCreating(false)
        if (params.get('bookingId')) {
            params.delete('bookingId')
            setParams(params, { replace: true })
        }
    }

    return (
        <div className="container section">
            <PageHeader
                title="Support"
                subtitle="Raise a complaint or dispute a booking and follow its progress."
                actions={<button className="btn" onClick={() => setCreating(true)}>Raise a case</button>}
            />
            {error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : loading && !data ? (
                <Spinner />
            ) : data.data.length === 0 ? (
                <EmptyState title="No cases yet" action={<button className="btn" onClick={() => setCreating(true)}>Raise a case</button>}>
                    Cases you raise will appear here.
                </EmptyState>
            ) : (
                <>
                    <ul className="list">
                        {data.data.map((c) => (
                            <li key={c.caseId} className="card booking-row">
                                <div className="booking-main">
                                    <div className="row-gap">
                                        <Link to={`/support/${c.caseId}`} className="booking-title">{c.subject}</Link>
                                        <StatusBadge status={c.status} />
                                        <span className="chip">{c.type}</span>
                                    </div>
                                    <div className="muted small">Opened {dateTime(c.createdAt)}</div>
                                </div>
                                <div className="booking-side">
                                    <Link to={`/support/${c.caseId}`} className="btn btn-ghost btn-sm">Details</Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Pagination meta={data.meta} onPage={(p) => setParams({ page: String(p) })} />
                </>
            )}
            {creating && (
                <NewCaseForm
                    initialBookingId={params.get('bookingId') || ''}
                    onClose={closeForm}
                    onSaved={() => { closeForm(); reload() }}
                />
            )}
        </div>
    )
}
