import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { venuesApi } from '../api'
import { useAsync, useTitle } from '../lib/hooks'
import VenueCard, { VenueCardSkeleton } from '../components/VenueCard'
import { ErrorState } from '../components/ui'
import hero from '../assets/hero.svg'

const STEPS = [
    ['1', 'Find', 'Filter by location, capacity and budget to shortlist the right space.'],
    ['2', 'Reserve', 'Pick your date and time. We hold the slot for you while you pay.'],
    ['3', 'Pay securely', 'Checkout with Stripe. Your booking is confirmed the moment payment clears.'],
]

export default function Landing() {
    useTitle('')
    const nav = useNavigate()
    const [q, setQ] = useState('')
    const [location, setLocation] = useState('')
    const featured = useAsync((signal) => venuesApi.list({ limit: 6, sort: 'newest' }, signal), [])

    const search = (e) => {
        e.preventDefault()
        const p = new URLSearchParams()
        if (q.trim()) p.set('q', q.trim())
        if (location.trim()) p.set('location', location.trim())
        nav(`/search?${p}`)
    }

    return (
        <>
            <section className="hero" style={{ '--hero-url': `url(${hero})` }}>
                <div className="container hero-inner">
                    <h1>Find the perfect venue for your event</h1>
                    <p>Weddings, conferences, launches and parties. Browse spaces, check the price up front, and book in minutes.</p>
                    <form className="hero-search" onSubmit={search} role="search">
                        <input aria-label="What are you planning?" placeholder="Venue name or keyword" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} />
                        <input aria-label="Location" placeholder="City or area" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} />
                        <button className="btn btn-gold">Search venues</button>
                    </form>
                </div>
            </section>

            <section className="container section">
                <div className="section-head">
                    <h2>Newly listed venues</h2>
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
                    <p className="muted">No venues listed yet. Check back soon.</p>
                )}
            </section>

            <section className="container section">
                <div className="section-head"><h2>How it works</h2></div>
                <div className="steps">
                    {STEPS.map(([n, t, d]) => (
                        <div className="card step" key={n}>
                            <span className="step-n">{n}</span>
                            <h3>{t}</h3>
                            <p className="muted">{d}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="container section">
                <div className="cta-band">
                    <div>
                        <h2>Own a venue?</h2>
                        <p>List your space, set your hourly rate and let customers book and pay online.</p>
                    </div>
                    <Link to="/register?role=owner" className="btn btn-gold">List your venue</Link>
                </div>
            </section>
        </>
    )
}
