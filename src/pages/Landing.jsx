import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { venuesApi } from '../api'
import { useAsync, useTitle } from '../lib/hooks'
import VenueCard, { VenueCardSkeleton } from '../components/VenueCard'
import { EmptyState, ErrorState } from '../components/ui'
import Icon from '../components/Icons'
import { useAuth } from '../auth/AuthProvider'
import hero from '../assets/hero.svg'

const STEPS = [
    ['search', 'Find', 'Filter by location, capacity and budget to shortlist the right space.'],
    ['calendar', 'Request', 'Choose your date and time. The venue owner reviews your request first.'],
    ['shield', 'Confirm', 'Once accepted, pay securely through Stripe to confirm your booking.'],
]

const OCCASIONS = [
    ['heart', 'Weddings', 'wedding'],
    ['briefcase', 'Conferences', 'conference'],
    ['sparkle', 'Parties', 'party'],
    ['mic', 'Launches', 'launch'],
]

const TRUST = [
    ['card', 'Prices shown up front'],
    ['clock', 'Owner approval before payment'],
    ['shield', 'Secure checkout with Stripe'],
]

export default function Landing() {
    useTitle('')
    const nav = useNavigate()
    const { user } = useAuth()
    const isVenueOwner = user?.role === 'Venue Owner'
    const [q, setQ] = useState('')
    const [location, setLocation] = useState('')
    const [guests, setGuests] = useState('')
    const featured = useAsync((signal) => venuesApi.list({ limit: 6, sort: 'verified_newest' }, signal), [])

    const search = (e) => {
        e.preventDefault()
        const p = new URLSearchParams()
        if (q.trim()) p.set('q', q.trim())
        if (location.trim()) p.set('location', location.trim())
        if (guests) p.set('minCapacity', guests)
        nav(`/search?${p}`)
    }

    return (
        <>
            <section className="hero" style={{ '--hero-url': `url(${hero})` }}>
                <div className="container hero-inner">
                    <span className="eyebrow">Event venues, booked in minutes</span>
                    <h1>Find the perfect venue for <em>your event</em></h1>
                    <p>Weddings, conferences, launches and parties. Find a space by location and guest count, compare details, and book with confidence.</p>
                    <form className="hero-search" onSubmit={search} role="search">
                        <label className="hero-field"><Icon name="search" size={18} /><input aria-label="What are you planning?" placeholder="Venue name or keyword" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} /></label>
                        <label className="hero-field"><Icon name="pin" size={18} /><input aria-label="Location" placeholder="City or area" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} /></label>
                        <label className="hero-field"><Icon name="users" size={18} /><input aria-label="Number of guests" type="number" min="1" max="1000000" placeholder="Guests" value={guests} onChange={(e) => setGuests(e.target.value)} /></label>
                        <button className="btn btn-gold btn-lg"><Icon name="search" size={18} /> Find a venue</button>
                    </form>
                    <div className="occasions">
                        <span>Popular:</span>
                        {OCCASIONS.map(([icon, label, term]) => (
                            <Link key={term} to={`/search?q=${term}`} className="occasion"><Icon name={icon} size={15} /> {label}</Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="trust-strip">
                <div className="container trust-row">
                    {TRUST.map(([icon, text]) => (
                        <div className="trust-item" key={text}><Icon name={icon} size={20} /> <span>{text}</span></div>
                    ))}
                </div>
            </section>

            <section className="container section">
                <div className="section-head">
                    <h2>Featured venues</h2>
                    <Link to="/search">View all →</Link>
                </div>
                {featured.error ? (
                    <ErrorState error={featured.error} onRetry={featured.reload} title="Couldn't load venues" />
                ) : (
                    <div className="venue-grid">
                        {featured.loading
                            ? Array.from({ length: 3 }, (_, i) => <VenueCardSkeleton key={i} />)
                            : featured.data.data.map((v) => <VenueCard key={v.venueId} venue={v} />)}
                    </div>
                )}
                {!featured.loading && !featured.error && featured.data.data.length === 0 && (
                    <EmptyState title="New spaces are on the way" action={<Link to="/search" className="btn btn-ghost">Browse all venues</Link>}>
                        There are no listings to feature right now. Check back soon or explore the full venue catalogue.
                    </EmptyState>
                )}
            </section>

            <section className="container section">
                <div className="section-head"><h2>How it works</h2></div>
                <div className="steps">
                    {STEPS.map(([icon, t, d], i) => (
                        <div className="card step" key={t}>
                            <span className="step-n"><Icon name={icon} size={22} /></span>
                            <span className="step-num">0{i + 1}</span>
                            <h3>{t}</h3>
                            <p className="muted">{d}</p>
                        </div>
                    ))}
                </div>
            </section>

            {!user && <section className="container section">
                <div className="cta-band">
                    <div>
                        <span className="cta-eyebrow">For venue owners</span>
                        <h2>Bring your space to the right people.</h2>
                        <p>Share your venue details, set clear pricing, and manage bookings from one place.</p>
                    </div>
                    <Link to="/register?role=owner" className="btn btn-gold">List your venue <span aria-hidden>→</span></Link>
                </div>
            </section>}
            {isVenueOwner && <section className="container section">
                <div className="cta-band">
                    <div>
                        <span className="cta-eyebrow">Venue owner workspace</span>
                        <h2>Keep your listings up to date.</h2>
                        <p>Review availability, update venue details, and keep an eye on upcoming bookings.</p>
                    </div>
                    <Link to="/owner" className="btn btn-gold">Manage my venues <span aria-hidden>→</span></Link>
                </div>
            </section>}
        </>
    )
}
