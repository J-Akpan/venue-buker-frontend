import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminPrivacyApi } from '../api'
import { parseError } from '../api/client'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime } from '../lib/format'
import { Alert, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, Spinner, StatusBadge } from '../components/ui'
import { useToast } from '../components/Toast'

const ACTIVE_STATUSES = ['open', 'in_review']

function ResolvePrivacyRequest({ request, onClose, onResolved }) {
    const toast = useToast()
    const [note, setNote] = useState(request.note || '')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [confirming, setConfirming] = useState('')

    const resolve = async (decision) => {
        setBusy(true)
        setError('')
        try {
            await adminPrivacyApi.resolve(request.requestId, {
                decision,
                ...(note.trim() && { note: note.trim() }),
            })
            toast.success(decision === 'review' ? 'Request marked in review.' : `Request ${decision === 'complete' ? 'completed' : 'rejected'}.`)
            onResolved()
        } catch (err) {
            setError(parseError(err).message)
            setConfirming('')
        } finally {
            setBusy(false)
        }
    }

    if (confirming) {
        const deletion = request.requestType === 'deletion' && confirming === 'complete'
        return (
            <ConfirmDialog
                open
                danger={deletion || confirming === 'reject'}
                busy={busy}
                title={deletion ? 'Complete account deletion?' : 'Reject this privacy request?'}
                confirmLabel={deletion ? 'Complete deletion' : 'Reject request'}
                message={deletion
                    ? 'This anonymizes the account, hides the user’s owned venues, cancels active bookings and processes applicable refunds. Stripe payout account records may need separate operator handling.'
                    : 'This closes the request as rejected. The decision cannot be reopened.'}
                onConfirm={() => resolve(confirming)}
                onClose={() => setConfirming('')}
            />
        )
    }

    return (
        <Modal open title="Review privacy request" onClose={busy ? () => {} : onClose}>
            {error && <Alert>{error}</Alert>}
            <dl className="summary">
                <div><dt>Request</dt><dd>{request.requestType === 'deletion' ? 'Account deletion' : 'Data export'}</dd></div>
                <div><dt>Account</dt><dd>{request.subject?.username || 'Unknown'}{request.subject?.email ? ` · ${request.subject.email}` : ''}</dd></div>
                <div><dt>Role</dt><dd>{request.subject?.role || 'Unknown'}</dd></div>
                <div><dt>Submitted</dt><dd>{dateTime(request.createdAt)}</dd></div>
                <div><dt>Status</dt><dd><StatusBadge status={request.status} /></dd></div>
            </dl>
            {request.note && <p className="muted small">Previous note: {request.note}</p>}
            <Field label="Staff note (optional)" hint="Up to 2,000 characters; visible in the request history.">
                <textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {request.requestType === 'deletion' && <Alert type="warn">Check outstanding refunds, disputes and payout records before completing deletion. A connected Stripe account requires separate operator handling.</Alert>}
            <div className="modal-foot-inline">
                {request.status === 'open' && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => resolve('review')}>Mark in review</button>}
                <button type="button" className="btn btn-ghost danger-text" disabled={busy} onClick={() => setConfirming('reject')}>Reject</button>
                {request.requestType === 'deletion' && <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setConfirming('complete')}>Complete deletion</button>}
            </div>
        </Modal>
    )
}

export default function AdminPrivacy() {
    useTitle('Privacy requests')
    const [params, setParams] = useSearchParams()
    const page = Number(params.get('page')) || 1
    const status = params.get('status') || ''
    const [selected, setSelected] = useState(null)
    const { data, error, loading, reload } = useAsync(
        (signal) => adminPrivacyApi.list({ page, limit: 20, ...(status && { status }) }, signal),
        [page, status],
    )

    const setStatus = (value) => setParams(value ? { status: value } : {})

    return (
        <div className="container section">
            <PageHeader title="Privacy requests" subtitle={data ? `${data.meta.total} requests` : 'Review data export and account deletion requests.'} />
            <div className="row-gap" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                <label className="row-gap">
                    Status
                    <select aria-label="Filter privacy requests by status" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto' }}>
                        <option value="">All statuses</option>
                        <option value="open">Open</option>
                        <option value="in_review">In review</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </label>
            </div>

            {error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : loading && !data ? (
                <Spinner />
            ) : data.data.length === 0 ? (
                <EmptyState title="No privacy requests" />
            ) : (
                <>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead><tr><th>Submitted</th><th>Account</th><th>Request</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {data.data.map((request) => (
                                    <tr key={request.requestId}>
                                        <td>{dateTime(request.createdAt)}</td>
                                        <td>
                                            <strong>{request.subject?.username || 'Unknown account'}</strong><br />
                                            <span className="muted small">{request.subject?.email || 'Account details unavailable'}</span>
                                        </td>
                                        <td>{request.requestType === 'deletion' ? 'Account deletion' : 'Data export'}</td>
                                        <td><StatusBadge status={request.status} /></td>
                                        <td>
                                            {ACTIVE_STATUSES.includes(request.status)
                                                ? <button className="btn btn-sm" onClick={() => setSelected(request)}>Review</button>
                                                : <span className="muted small">{request.note || 'No action needed'}</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={data.meta} onPage={(nextPage) => {
                        const next = new URLSearchParams(params)
                        next.set('page', String(nextPage))
                        setParams(next)
                    }} />
                </>
            )}

            {selected && (
                <ResolvePrivacyRequest
                    request={selected}
                    onClose={() => setSelected(null)}
                    onResolved={() => { setSelected(null); reload() }}
                />
            )}
        </div>
    )
}
