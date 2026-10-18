import React from 'react'
import { Link } from 'react-router-dom'
import { money } from '../lib/format'
import placeholder from '../assets/venue1.svg'

export function VenueImage({ venue, className = '' }) {
    const [broken, setBroken] = React.useState(false)
    const src = !broken && venue.pictures?.[0] ? venue.pictures[0] : placeholder
    return <img src={src} alt={venue.pictures?.[0] && !broken ? venue.name : ''} className={className} loading="lazy" onError={() => setBroken(true)} />
}

export default function VenueCard({ venue }) {
    return (
        <Link to={`/venues/${venue.venueId}`} className="venue-card">
            <div className="venue-card-img">
                <VenueImage venue={venue} />
            </div>
            <div className="venue-card-body">
                <h3>{venue.name}</h3>
                <p className="muted venue-loc">📍 {venue.location}</p>
                <div className="venue-card-meta">
                    <span className="chip">👥 Up to {Number(venue.capacity).toLocaleString()}</span>
                    <span className="venue-price">
                        {money(venue.pricePerHour, venue.currency)}
                        <small> / hour</small>
                    </span>
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
