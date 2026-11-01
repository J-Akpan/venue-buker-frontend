import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { bookingsApi, paymentsApi } from '../api'
import { parseError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime, durationLabel, money } from '../lib/format'
import Icon from '../components/Icons'
import { BackLink, ConfirmDialog, ErrorState, Spinner, StatusBadge } from '../components/ui'
import { HoldTimer, canCancel, effectiveStatus } from '../components/BookingParts'
import { useToast } from '../components/Toast'
import CancellationSchedule, { estimateCancellationRefundPercent } from '../components/CancellationSchedule'
import { PENDING_BOOKING_KEY } from './VenueDetails'

export default function BookingDetail() {
    const { bookingId } = useParams()
    const { user } = useAuth()
    const toast = useToast()
    useTitle('Booking details')
    const { data, error, loading, reload } = useAsync(
        async (signal) => {
            const { booking } = await bookingsApi.get(bookingId, signal)
            // Payment history is only visible to the booker, so skip the call for owners/admins viewing it.
            const payments = booking.userId === user.userId ? (await paymentsApi.forBooking(bookingId, signal)).data : []
            return { booking, payments }
        },
        [bookingId],
    )
    const [busy, setBusy] = useState(false)
    const [confirm, setConfirm] = useState(false)

    if (loading && !data) return <Spinner />
    if (error?.status === 404) {
        return (
            <div className="container section state-box">
                <h1>Booking not found</h1>
                <Link to="/bookings" className="btn">My bookings</Link>
            </div>
        )
    }
    if (error) return <div className="container section"><ErrorState error={error} onRetry={reload} /></div>

    const { booking: b, payments } = data
    const status = effectiveStatus(b)
    const mine = b.userId === user.userId

    const pay = async () => {
        setBusy(true)
        try {
            const { url } = await paymentsApi.checkout(b.bookingId)
            try { sessionStorage.setItem(PENDING_BOOKING_KEY, b.bookingId) } catch { /* private mode */ }
            window.location.assign(url)
        } catch (err) {
            toast.error(parseError(err).message)
            setBusy(false)
            reload()
        }
    }
    const cancel = async () => {
        setBusy(true)
        try {
            const { booking } = await bookingsApi.cancel(b.bookingId)
            if (b.status === 'confirmed') {
                toast.success(booking.cancellationRefundPercent > 0
                    ? `Booking cancelled. A ${booking.cancellationRefundPercent}% refund is being processed.`
                    : 'Booking cancelled. No refund is due under the saved cancellation terms.')
            } else toast.success('Booking cancelled.')
            setConfirm(false)
            reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="container section narrow">
            <BackLink to="/bookings">My bookings</BackLink>
            <div className="card">
                <div className="row-between">
                    <h1>{b.venue?.name || 'Venue'}</h1>
                    <StatusBadge status={status} />
                </div>
                {b.venue?.location && <p className="venue-loc"><Icon name="pin" size={15} /> {b.venue.location}</p>}

                {status === 'pending' && mine && (
                    <div className="alert alert-warn">
                        <div><strong>Payment required.</strong> The venue accepted your request. Pay before the hold expires to confirm the booking.</div>
                        <HoldTimer expiresAt={b.expiresAt} onExpire={reload} />
                    </div>
                )}
                {status === 'requested' && mine && (
                    <div className="alert alert-info">
                        <div><strong>Waiting for the venue owner.</strong> Your request is holding the selected time while the venue reviews it.</div>
                        <HoldTimer expiresAt={b.expiresAt} label="Owner response due in" onExpire={reload} />
                    </div>
                )}
                {status === 'declined' && <div className="alert alert-info">The venue owner declined this request. You can choose another time or venue.</div>}
                {status === 'expired' && <div className="alert alert-info">{b.status === 'requested' ? 'The venue response window expired' : 'The payment window expired'} and the slot was released. You can book it again if it's still free.</div>}

                <dl className="summary">
                    <div><dt>Starts</dt><dd>{dateTime(b.startsAt)}</dd></div>
                    <div><dt>Ends</dt><dd>{dateTime(b.endsAt)}</dd></div>
                    <div><dt>Duration</dt><dd>{durationLabel(b.startsAt, b.endsAt)}</dd></div>
                    {b.eventType && <div><dt>Event type</dt><dd>{b.eventType}</dd></div>}
                    {b.attendeeCount && <div><dt>Attendees</dt><dd>{Number(b.attendeeCount).toLocaleString()}</dd></div>}
                    {b.priceBreakdown && <>
                        <div><dt>Venue rental</dt><dd>{money(b.priceBreakdown.venueRental, b.currency)}</dd></div>
                        <div><dt>Cleaning fee</dt><dd>{money(b.priceBreakdown.cleaningFee, b.currency)}</dd></div>
                        {(b.priceBreakdown.addOns || []).map((line) => <div key={line.addOnId}><dt>Extra · {line.name}</dt><dd>{money(line.lineTotal, b.currency)}</dd></div>)}
                    </>}
                    <div className="total"><dt>Due now</dt><dd>{money(b.priceBreakdown?.amountDueNow ?? b.totalPrice, b.currency)}</dd></div>
                    {Number(b.priceBreakdown?.refundableDepositDueToVenue) > 0 && <div><dt>Refundable deposit (due separately to venue)</dt><dd>{money(b.priceBreakdown.refundableDepositDueToVenue, b.currency)}</dd></div>}
                    <div><dt>Booking ref</dt><dd className="mono">{b.bookingId.slice(0, 8).toUpperCase()}</dd></div>
                    <div><dt>Booked on</dt><dd>{dateTime(b.createdAt)}</dd></div>
                    {b.cancelledAt && <div><dt>Cancelled on</dt><dd>{dateTime(b.cancelledAt)}</dd></div>}
                </dl>
                {b.cancellationPolicySnapshot && <p className="muted small"><strong>Cancellation policy:</strong> {b.cancellationPolicySnapshot}</p>}
                <CancellationSchedule rules={b.cancellationRulesSnapshot} title="Refund terms saved with this booking" />
                {b.status === 'cancelled' && b.cancellationRefundPercent !== undefined && (
                    <p className="muted small"><strong>Refund under saved terms:</strong> {b.cancellationRefundPercent}%</p>
                )}

                <div className="row-gap">
                    {status === 'pending' && mine && <button className="btn" disabled={busy} onClick={pay}>{busy ? 'Opening…' : 'Pay now'}</button>}
                    {b.venue && <Link to={`/venues/${b.venueId}`} className="btn btn-ghost">View venue</Link>}
                    <Link to={`/support?bookingId=${b.bookingId}`} className="btn btn-ghost">Report a problem</Link>
                    {canCancel(b, status) && <button className="btn btn-ghost danger-text" onClick={() => setConfirm(true)}>Cancel booking</button>}
                </div>
            </div>

            {mine && (
                <div className="card" style={{ marginTop: 16 }}>
                    <h2>Payments</h2>
                    {payments.length === 0 ? (
                        <p className="muted">No payment attempts yet.</p>
                    ) : (
                        <table className="table">
                            <thead><tr><th>Date</th><th>Amount</th><th>Refunded</th><th>Status</th></tr></thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.paymentId}>
                                        <td>{dateTime(p.refundedAt || p.paidAt || b.createdAt)}</td>
                                        <td>{money(p.amount, p.currency)}</td>
                                        <td>{money(p.refundedAmount || 0, p.currency)}</td>
                                        <td><StatusBadge status={p.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={confirm}
                danger
                busy={busy}
                title="Cancel this booking?"
                confirmLabel="Yes, cancel booking"
                message={b.status === 'confirmed'
                    ? `Based on the saved cancellation terms, this booking is currently eligible for an estimated ${estimateCancellationRefundPercent(b.cancellationRulesSnapshot, b.startsAt)}% refund.`
                    : 'This releases the slot. A payment is only taken after the venue accepts your request.'}
                onConfirm={cancel}
                onClose={() => setConfirm(false)}
            />
        </div>
    )
}
