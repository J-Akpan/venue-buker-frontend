import React from 'react'
import { Link, useLocation } from 'react-router-dom'

/** Compatibility screen for the retired mock payment flow. Card details are collected by Stripe Checkout. */
export default function Payment() {
    const location = useLocation()
    const bookingId = location.state?.booking?.bookingId

    return (
        <div className="container section narrow">
            <div className="card">
                <h1>Secure checkout</h1>
                <p className="muted">VenBuk uses Stripe Checkout for payments. Open your booking to continue; card details are never entered on this page.</p>
                <Link to={bookingId ? `/bookings/${bookingId}` : '/bookings'} className="btn">
                    {bookingId ? 'Continue to booking' : 'View my bookings'}
                </Link>
            </div>
        </div>
    )
}
