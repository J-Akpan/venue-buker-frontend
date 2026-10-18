import React from 'react'
import { Link } from 'react-router-dom'
import { useTitle } from '../lib/hooks'

export default function About() {
    useTitle('How it works')
    return (
        <div className="container section narrow">
            <h1>How VenBuk works</h1>
            <p className="prose">VenBuk connects event organisers with venue owners. Prices are transparent, availability is enforced automatically, and payment is handled securely by Stripe.</p>

            <h2>Booking a venue</h2>
            <ol className="prose">
                <li>Search by location, capacity and budget, then open a venue.</li>
                <li>Choose your start and end time (in 30-minute steps, up to 14 days). The total is calculated for you.</li>
                <li>Reserve &amp; pay. Your slot is held for a short window while you complete Stripe Checkout.</li>
                <li>Once payment clears, your booking is confirmed and you get an email.</li>
            </ol>

            <h2>Cancellations &amp; refunds</h2>
            <p className="prose">You can cancel any upcoming booking from <Link to="/bookings">My bookings</Link>. Paid bookings are refunded to the original card automatically. Unpaid holds that aren't completed in time are released on their own.</p>

            <h2>For venue owners</h2>
            <p className="prose">Create an owner account, list your space with photos and an hourly rate, and track every booking from your dashboard. <Link to="/register?role=owner">List your venue →</Link></p>
        </div>
    )
}
