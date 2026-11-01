import React from 'react'
import { Link } from 'react-router-dom'
import { money } from '../lib/format'
import Icon from './Icons'

// Warm, event-friendly gradients (all work with white/teal text). One is picked per venue, stably.
const TONES = [
    ['#0f5f63', '#2a9d8f'],
    ['#14532d', '#5aa786'],
    ['#7c4a1e', '#d9a441'],
    ['#1e3a5f', '#4f8fb8'],
    ['#6b2d3e', '#c9788a'],
    ['#3f3a6d', '#8b86c9'],
]
const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Shown when a venue has no photo (or it fails to load). */
export function VenuePlaceholder({ venue, className = '' }) {
    const [a, b] = TONES[hash(venue?.venueId || venue?.name) % TONES.length]
    return (
        <div className={`venue-ph ${className}`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} role="img" aria-label={venue?.name ? `${venue.name} (no photo yet)` : 'No photo yet'}>
            <span className="venue-ph-ring r1" />
            <span className="venue-ph-ring r2" />
            <Icon name="building" size={44} />
        </div>
    )
}

export function VenueImage({ venue, className = '' }) {
    const [broken, setBroken] = React.useState(false)
    const url = venue.pictures?.[0]
    if (!url || broken) return <VenuePlaceholder venue={venue} className={className} />
    return <img src={url} alt={venue.name} className={className} loading="lazy" onError={() => setBroken(true)} />
}

export default function VenueCard({ venue }) {
    return (
        <Link to={`/venues/${venue.venueId}`} className="venue-card">
            <div className="venue-card-img">
                <VenueImage venue={venue} />
                <span className="venue-card-cap"><Icon name="users" size={14} /> Up to {Number(venue.capacity).toLocaleString()}</span>
                {venue.isVerified && <span className="venue-verified">Verified</span>}
            </div>
            <div className="venue-card-body">
                <h3>{venue.name}</h3>
                <p className="venue-loc"><Icon name="pin" size={15} /> {venue.location}</p>
                {!!venue.eventTypes?.length && <div className="venue-card-tags" aria-label="Suitable event types">
                    {venue.eventTypes.slice(0, 2).map((type) => <span className="chip" key={type}>{type}</span>)}
                    {venue.eventTypes.length > 2 && <span className="chip">+{venue.eventTypes.length - 2}</span>}
                </div>}
                <div className="venue-card-meta">
                    <span className="venue-price">
                        {money(venue.pricePerHour, venue.currency)}
                        <small> / hour</small>
                    </span>
                    <span className="venue-card-cta">View <span aria-hidden>→</span></span>
                </div>
            </div>
        </Link>
    )
}

export function VenueCardSkeleton() {
    return (
        <div className="venue-card skeleton" aria-hidden>
            <div className="venue-card-img" />
            <div className="venue-card-body">
                <div className="sk-line w60" />
                <div className="sk-line w40" />
                <div className="sk-line w80" />
            </div>
        </div>
    )
}
