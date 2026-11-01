import React from 'react'
import { Link } from 'react-router-dom'
import { useTitle } from '../lib/hooks'
import { PageHeader } from '../components/ui'
import Icon from '../components/Icons'

const FLOW = [
    ['search', 'Find your space', 'Filter venues by location, capacity, budget, event type and amenities.'],
    ['calendar', 'Check the details', 'See current availability, get an itemized price quote and read the venue terms.'],
    ['card', 'Reserve and pay', 'Create a booking hold and finish payment securely through Stripe Checkout.'],
    ['check', 'Get confirmation', 'Once payment is verified, the booking is confirmed and a confirmation email is sent.'],
]

export default function About() {
    useTitle('How it works')
    return (
        <div className="container section about-page">
            <PageHeader
                title="Plan your event with confidence"
                subtitle="VenBuk connects event organisers with venue owners, with clear venue details and secure online booking."
            />

            <section aria-labelledby="booking-steps-heading">
                <div className="section-head"><h2 id="booking-steps-heading">From search to confirmed booking</h2></div>
                <div className="steps about-steps">
                    {FLOW.map(([icon, title, description], index) => (
                        <article className="card step" key={title}>
                            <span className="step-n"><Icon name={icon} size={21} /></span>
                            <span className="step-num">0{index + 1}</span>
                            <h3>{title}</h3>
                            <p className="muted">{description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <div className="about-info-grid">
                <section className="card about-info-card">
                    <span className="about-info-icon"><Icon name="clock" size={20} /></span>
                    <h2>Booking times</h2>
                    <p>Choose a future start time and a duration in 30-minute increments. A booking can last up to 14 days. The venue owner’s cancellation policy is shown before you reserve and saved with your booking.</p>
                </section>
                <section className="card about-info-card">
                    <span className="about-info-icon"><Icon name="shield" size={20} /></span>
                    <h2>Clear prices and payments</h2>
                    <p>Your quote shows venue rental and cleaning fees due at checkout. Any refundable deposit owed to the venue is listed separately. Payment confirmation can take a short moment while the secure checkout result is verified.</p>
                </section>
            </div>

            <section className="cta-band about-cta">
                <div>
                    <span className="cta-eyebrow">Ready when you are</span>
                    <h2>Find a venue that feels right.</h2>
                    <p>Explore spaces and compare the details before you book.</p>
                </div>
                <Link to="/search" className="btn btn-gold">Explore venues <span aria-hidden>→</span></Link>
            </section>
        </div>
    )
}
