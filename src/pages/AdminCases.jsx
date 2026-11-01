import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adminCasesApi } from '../api'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime } from '../lib/format'
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge } from '../components/ui'

export default function AdminCases() {
    useTitle('Cases')
    const [params, setParams] = useSearchParams()
    const page = Number(params.get('page')) || 1
    const status = params.get('status') || ''
    const type = params.get('type') || ''
    const unassigned = params.get('unassigned') === '1'
    const { data, error, loading, reload } = useAsync(
        () => adminCasesApi.list({ page, limit: 20, ...(status && { status }), ...(type && { type }), ...(unassigned && { unassigned: true }) }),
        [page, status, type, unassigned],
    )

    const setFilter = (k, v) => {
        const next = new URLSearchParams(params)
        if (v) next.set(k, v); else next.delete(k)
        next.delete('page')
        setParams(next)
    }

    return (
        <div className="container section">
            <PageHeader title="Cases" subtitle={data ? `${data.meta.total} in the queue, oldest first` : undefined} />
            <div className="row-gap" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                <select aria-label="Status" value={status} onChange={(e) => setFilter('status', e.target.value)} style={{ width: 'auto' }}>
                    <option value="">Any status</option>
                    <option value="open">Open</option>
                    <option value="in_review">In review</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                </select>
                <select aria-label="Type" value={type} onChange={(e) => setFilter('type', e.target.value)} style={{ width: 'auto' }}>
                    <option value="">Any type</option>
                    <option value="complaint">Complaint</option>
                    <option value="dispute">Dispute</option>
                </select>
                <label className="row-gap">
                    <input type="checkbox" checked={unassigned} onChange={(e) => setFilter('unassigned', e.target.checked ? '1' : '')} style={{ width: 'auto' }} />
                    Unassigned only
                </label>
            </div>
            {error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : loading && !data ? (
                <Spinner />
            ) : data.data.length === 0 ? (
                <EmptyState title="Nothing in the queue" />
            ) : (
                <>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead><tr><th>Subject</th><th>Type</th><th>Status</th><th>Assigned</th><th>Opened</th></tr></thead>
                            <tbody>
                                {data.data.map((c) => (
                                    <tr key={c.caseId}>
                                        <td><Link to={`/admin/cases/${c.caseId}`}><strong>{c.subject}</strong></Link></td>
                                        <td><span className="chip">{c.type}</span></td>
                                        <td><StatusBadge status={c.status} /></td>
                                        <td>{c.assignedTo ? 'Yes' : <span className="muted">—</span>}</td>
                                        <td>{dateTime(c.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={data.meta} onPage={(p) => { const n = new URLSearchParams(params); n.set('page', String(p)); setParams(n) }} />
                </>
            )}
        </div>
    )
}
