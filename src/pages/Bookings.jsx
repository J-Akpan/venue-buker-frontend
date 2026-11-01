import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { bookingsApi, paymentsApi } from '../api'
import { parseError } from '../api/client'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime, durationLabel, money } from '../lib/format'
import Icon from '../components/Icons'
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge } from '../components/ui'
import { HoldTimer, canCancel, effectiveStatus } from '../components/BookingParts'
import { useToast } from '../components/Toast'
import { estimateCancellationRefundPercent } from '../components/CancellationSchedule'
import { PENDING_BOOKING_KEY } from './VenueDetails'

export default function Bookings() {
    useTitle('My bookings')
    const toast = useToast()
    const [params, setParams] = useSearchParams()
    const page = Number(params.get('page')) || 1
    const { data, error, loading, reload } = useAsync((signal) => bookingsApi.mine({ page, limit: 10 }, signal), [page])
    const [cancelling, setCancelling] = useState(null)
    const [busyId, setBusyId] = useState(null)

    const pay = async (b) => {
        setBusyId(b.bookingId)
        try {
            const { url } = await paymentsApi.checkout(b.bookingId)
            try { sessionStorage.setItem(PENDING_BOOKING_KEY, b.bookingId) } catch { /* private mode */ }
            window.location.assign(url)
        } catch (err) {
            toast.error(parseError(err).message)
            setBusyId(null)
            reload()
        }
    }

    const confirmCancel = async () => {
        setBusyId(cancelling.bookingId)
        try {
            const { booking } = await bookingsApi.cancel(cancelling.bookingId)
            if (cancelling.status === 'confirmed') {
                toast.success(booking.cancellationRefundPercent > 0
                    ? `Booking cancelled. A ${booking.cancellationRefundPercent}% refund is being processed.`
                    : 'Booking cancelled. No refund is due under the saved cancellation terms.')
            } else toast.success('Booking cancelled.')
            setCancelling(null)
            reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="container section">
            <PageHeader title="My bookings" subtitle="Track venue responses, finish payments after approval and manage cancellations." actions={<Link to="/search" className="btn">Book a venue</Link>} />

            {error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : loading && !data ? (
                <Spinner />
            ) : data.data.length === 0 ? (
                <EmptyState title="No bookings yet" action={<Link to="/search" className="btn">Find a venue</Link>}>
                    When you reserve a venue it will show up here.
                </EmptyState>
            ) : (
                <>
                    <ul className="list">
                        {data.data.map((b) => {
                            const status = effectiveStatus(b)
                            return (
                                <li key={b.bookingId} className="card booking-row">
                                    <div className="booking-main">
                                        <div className="row-gap">
                                            <Link to={`/bookings/${b.bookingId}`} className="booking-title">{b.venue?.name || 'Venue'}</Link>
                                            <StatusBadge status={status} />
                                        </div>
                                        {b.venue?.location && <div className="venue-loc small"><Icon name="pin" size={14} /> {b.venue.location}</div>}
                                        <div>{dateTime(b.startsAt)} → {dateTime(b.endsAt)} <span className="muted">({durationLabel(b.startsAt, b.endsAt)})</span></div>
                                        {status === 'requested' && <><span className="muted small">Waiting for the venue owner to respond.</span><HoldTimer expiresAt={b.expiresAt} label="Owner response due in" onExpire={reload} /></>}
                                        {status === 'pending' && <HoldTimer expiresAt={b.expiresAt} onExpire={reload} />}
                                        {status === 'declined' && <span className="muted small">The venue owner declined this request.</span>}
                                    </div>
                                    <div className="booking-side">
                                        <strong>{money(b.totalPrice, b.currency)}</strong>
                                        <span className="muted small">Due now</span>
                                        <div className="row-gap">
                                            {status === 'pending' && (
                                                <button className="btn btn-sm" disabled={busyId === b.bookingId} onClick={() => pay(b)}>
                                                    {busyId === b.bookingId ? 'Opening…' : 'Pay now'}
                                                </button>
                                            )}
                                            <Link to={`/bookings/${b.bookingId}`} className="btn btn-ghost btn-sm">Details</Link>
                                            {canCancel(b, status) && (
                                                <button className="btn btn-ghost btn-sm danger-text" onClick={() => setCancelling(b)}>Cancel</button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                    <Pagination meta={data.meta} onPage={(p) => setParams({ page: String(p) })} />
                </>
            )}

            <ConfirmDialog
                open={!!cancelling}
                danger
                busy={busyId === cancelling?.bookingId}
                title="Cancel this booking?"
                confirmLabel="Yes, cancel booking"
                message={
                    cancelling?.status === 'confirmed'
                        ? `You've paid for ${cancelling?.venue?.name || 'this venue'}. Based on the saved cancellation terms, this booking is currently eligible for an estimated ${estimateCancellationRefundPercent(cancelling?.cancellationRulesSnapshot, cancelling?.startsAt)}% refund.`
                        : 'This releases the slot you were holding.'
                }
                onConfirm={confirmCancel}
                onClose={() => setCancelling(null)}
            />
        </div>
    )
}
