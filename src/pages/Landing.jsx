import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { venuesApi } from '../api'
import { useAsync, useTitle } from '../lib/hooks'
import VenueCard, { VenueCardSkeleton } from '../components/VenueCard'
import { ErrorState } from '../components/ui'
import Icon from '../components/Icons'
import hero from '../assets/hero.svg'

const STEPS = [
    ['search', 'Find', 'Filter by location, capacity and budget to shortlist the right space.'],
    ['calendar', 'Reserve', 'Pick your date and time. We hold the slot for you while you pay.'],
    ['shield', 'Pay securely', 'Checkout with Stripe. Your booking is confirmed the moment payment clears.'],
]

const OCCASIONS = [
    ['heart', 'Weddings', 'wedding'],
    ['briefcase', 'Conferences', 'conference'],
    ['sparkle', 'Parties', 'party'],
    ['mic', 'Launches', 'launch'],
]

const TRUST = [
    ['card', 'Prices shown up front'],
    ['clock', 'Your slot is held while you pay'],
    ['shield', 'Secure checkout with Stripe'],
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
                    <span className="eyebrow">Event venues, booked in minutes</span>
                    <h1>Find the perfect venue for <em>your event</em></h1>
                    <p>Weddings, conferences, launches and parties. Browse spaces, check the price up front, and book in minutes.</p>
                    <form className="hero-search" onSubmit={search} role="search">
                        <label className="hero-field"><Icon name="search" size={18} /><input aria-label="What are you planning?" placeholder="Venue name or keyword" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} /></label>
                        <label className="hero-field"><Icon name="pin" size={18} /><input aria-label="Location" placeholder="City or area" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} /></label>
                        <button className="btn btn-gold btn-lg">Search venues</button>
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
