import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingsApi } from '../api'
import { useTitle } from '../lib/hooks'
import { PENDING_BOOKING_KEY } from './VenueDetails'
import { Spinner } from '../components/ui'

const read = () => {
    try { return sessionStorage.getItem(PENDING_BOOKING_KEY) } catch { return null }
}

/**
 * Stripe sends the customer here after checkout. Confirmation actually arrives asynchronously via
 * the webhook, so on success we poll the booking until the server marks it confirmed.
 */
export default function PaymentResult({ kind }) {
    useTitle(kind === 'success' ? 'Payment received' : 'Payment cancelled')
    const [bookingId] = useState(read)
    const [state, setState] = useState(kind === 'success' && bookingId ? 'checking' : 'unknown')

    useEffect(() => {
        if (kind !== 'success' || !bookingId) return
        let stop = false
        let tries = 0
        const poll = async () => {
            try {
                const { booking } = await bookingsApi.get(bookingId)
                if (stop) return
                if (booking.status === 'confirmed') {
                    try { sessionStorage.removeItem(PENDING_BOOKING_KEY) } catch { /* ignore */ }
                    return setState('confirmed')
                }
                if (booking.status === 'cancelled' || booking.status === 'expired') return setState('problem')
            } catch { /* keep trying */ }
            if (++tries >= 20) return !stop && setState('slow')
            setTimeout(poll, 1500)
        }
        poll()
        return () => { stop = true }
    }, [kind, bookingId])

    const detail = bookingId ? `/bookings/${bookingId}` : '/bookings'

    if (kind === 'cancel') {
        return (
            <div className="container section state-box narrow">
                <div className="state-icon soft" aria-hidden>↩</div>
                <h1>Payment cancelled</h1>
                <p className="muted">No money was taken. Your slot stays held for a short time, so you can finish paying before it's released.</p>
                <div className="row-gap center-row">
                    <Link to={detail} className="btn">Back to my booking</Link>
                    <Link to="/search" className="btn btn-ghost">Browse venues</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container section state-box narrow">
            {state === 'checking' && (
                <>
                    <Spinner label="Confirming your payment…" />
                    <p className="muted small">This usually takes a few seconds. Please don't close this page.</p>
                </>
            )}
            {state === 'confirmed' && (
                <>
                    <div className="state-icon ok" aria-hidden>✓</div>
                    <h1>Booking confirmed!</h1>
                    <p className="muted">Payment received. A confirmation has been sent to your email.</p>
                </>
            )}
            {state === 'slow' && (
                <>
                    <div className="state-icon soft" aria-hidden>…</div>
                    <h1>Payment received, finalising</h1>
                    <p className="muted">Your bank has accepted the payment; confirmation is taking longer than usual. It will appear on your booking shortly. No need to pay again.</p>
                </>
            )}
            {state === 'problem' && (
                <>
                    <div className="state-icon" aria-hidden>!</div>
                    <h1>We couldn't confirm this booking</h1>
                    <p className="muted">The slot is no longer held. If you were charged, you'll be refunded automatically.</p>
                </>
            )}
            {state === 'unknown' && (
                <>
                    <div className="state-icon ok" aria-hidden>✓</div>
                    <h1>Thanks for your payment</h1>
                    <p className="muted">Check your bookings for the latest status.</p>
                </>
            )}
            {state !== 'checking' && (
                <div className="row-gap center-row">
                    <Link to={detail} className="btn">View booking</Link>
                    <Link to="/bookings" className="btn btn-ghost">All bookings</Link>
                </div>
            )}
        </div>
    )
}
