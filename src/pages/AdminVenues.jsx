import React, { useState } from 'react'
import { venuesApi } from '../api'
import { parseError } from '../api/client'
import { useToast } from '../components/Toast'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime, money } from '../lib/format'
import { ErrorState, PageHeader, Pagination, Spinner } from '../components/ui'

export default function AdminVenues() {
    useTitle('Venue verification')
    const toast = useToast()
    const [page, setPage] = useState(1)
    const [changing, setChanging] = useState('')
    const { data, error, loading, reload } = useAsync(
        (signal) => venuesApi.list({ page, limit: 20, sort: 'newest' }, signal),
        [page],
    )

    const toggle = async (venue) => {
        setChanging(venue.venueId)
        try {
            await venuesApi.setVerification(venue.venueId, !venue.isVerified)
            toast.success(venue.isVerified ? 'Venue verification removed' : 'Venue verified')
            reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setChanging('')
        }
    }

    return (
        <div className="container section">
            <PageHeader title="Venue verification" subtitle={data ? `${data.meta.total} public listings` : undefined} />
            {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Spinner /> : (
                <>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead><tr><th>Venue</th><th>Location</th><th>Capacity</th><th>Price / hour</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {data.data.map((venue) => (
                                    <tr key={venue.venueId}>
                                        <td><strong>{venue.name}</strong><br /><span className="muted small">Listed {dateTime(venue.createdAt)}</span></td>
                                        <td>{venue.location}</td>
                                        <td>{Number(venue.capacity).toLocaleString()}</td>
                                        <td>{money(venue.pricePerHour, venue.currency)}</td>
                                        <td><span className="chip">{venue.isVerified ? 'Verified' : 'Needs review'}</span></td>
                                        <td><button className={`btn btn-sm ${venue.isVerified ? 'btn-ghost' : ''}`} disabled={changing === venue.venueId} onClick={() => toggle(venue)}>{changing === venue.venueId ? 'Saving…' : venue.isVerified ? 'Remove verification' : 'Verify venue'}</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {data.data.length === 0 && <p className="muted">There are no public venue listings yet.</p>}
                    <Pagination meta={data.meta} onPage={setPage} />
                </>
            )}
        </div>
    )
}
