import React, { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { bookingsApi, paymentsApi, venuesApi } from '../api'
import { parseError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useAsync, useTitle } from '../lib/hooks'
import { money, newKey, toLocalInput } from '../lib/format'
import { Alert, BackLink, ErrorState, Field, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import placeholder from '../assets/venue1.svg'

const MIN_SLOT = 30
const MAX_DAYS = 14
export const PENDING_BOOKING_KEY = 'vb.pendingBooking'

function Gallery({ venue }) {
    const pics = venue.pictures?.length ? venue.pictures : [placeholder]
    const [i, setI] = useState(0)
    const [broken, setBroken] = useState({})
    const src = (n) => (broken[n] ? placeholder : pics[n])
    return (
        <div className="gallery">
            <div className="gallery-main">
                <img src={src(i)} alt={`${venue.name} photo ${i + 1}`} onError={() => setBroken((b) => ({ ...b, [i]: true }))} />
            </div>
            {pics.length > 1 && (
                <div className="gallery-thumbs">
                    {pics.map((_, n) => (
                        <button key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-pressed={n === i}>
                            <img src={src(n)} alt="" onError={() => setBroken((b) => ({ ...b, [n]: true }))} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function BookingPanel({ venue }) {
    const { user } = useAuth()
    const nav = useNavigate()
    const location = useLocation()
    const toast = useToast()
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    // One idempotency key per distinct request: a double-click or network retry returns the same booking.
    const keyRef = useRef({ sig: '', key: '' })

    const minStart = useMemo(() => {
        const d = new Date(Date.now() + 60 * 60000)
        d.setMinutes(Math.ceil(d.getMinutes() / MIN_SLOT) * MIN_SLOT, 0, 0)
        return toLocalInput(d)
    }, [])

    const check = useMemo(() => {
        if (!start || !end) return { problem: '', minutes: 0 }
        const s = new Date(start), e = new Date(end)
        const minutes = (e - s) / 60000
        if (Number.isNaN(minutes)) return { problem: 'Enter valid dates', minutes: 0 }
        if (s <= new Date()) return { problem: 'Start time must be in the future', minutes }
        if (minutes <= 0) return { problem: 'End time must be after the start time', minutes }
        if (minutes % MIN_SLOT !== 0) return { problem: `Duration must be a multiple of ${MIN_SLOT} minutes`, minutes }
        if (minutes > MAX_DAYS * 1440) return { problem: `Bookings can't exceed ${MAX_DAYS} days`, minutes }
        return { problem: '', minutes }
    }, [start, end])

    const total = check.minutes > 0 && !check.problem ? (check.minutes / 60) * Number(venue.pricePerHour) : null

    const onStart = (v) => {
        setStart(v)
        // Convenience: default to a 2-hour booking once a start is chosen.
        if (v && !end) setEnd(toLocalInput(new Date(new Date(v).getTime() + 2 * 3600000)))
    }

    const submit = async (e) => {
        e.preventDefault()
        if (!user) return nav('/login', { state: { from: location.pathname } })
        if (!start || !end || check.problem) return setError(check.problem || 'Choose a start and end time')
        setError('')
        setBusy(true)
        const body = { venueId: venue.venueId, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() }
        const sig = `${body.startsAt}|${body.endsAt}`
        if (keyRef.current.sig !== sig) keyRef.current = { sig, key: newKey() }
        let booking
        try {
            booking = (await bookingsApi.create(body, keyRef.current.key)).booking
        } catch (err) {
            const p = parseError(err)
            setError(p.code === 'CONFLICT' ? 'That time slot is already booked. Please choose a different time.' : p.message)
            setBusy(false)
            return
        }
        try {
            const { url } = await paymentsApi.checkout(booking.bookingId)
            try { sessionStorage.setItem(PENDING_BOOKING_KEY, booking.bookingId) } catch { /* private mode */ }
            window.location.assign(url) // hand off to Stripe Checkout
        } catch (err) {
            // The slot is held (unpaid) so the user can retry payment from the booking page.
            toast.error(`Slot reserved, but we couldn't start payment: ${parseError(err).message}`)
            nav(`/bookings/${booking.bookingId}`)
        }
    }

    return (
        <form className="card booking-panel" onSubmit={submit} noValidate>
            <div className="price-line">
                <strong>{money(venue.pricePerHour, venue.currency)}</strong> <span className="muted">/ hour</span>
            </div>
            <Alert>{error}</Alert>
            <Field label="Starts">
                <input type="datetime-local" step={MIN_SLOT * 60} min={minStart} value={start} onChange={(e) => onStart(e.target.value)} required />
            </Field>
            <Field label="Ends" error={check.problem}>
                <input type="datetime-local" step={MIN_SLOT * 60} min={start || minStart} value={end} onChange={(e) => setEnd(e.target.value)} required />
            </Field>

            {total !== null && (
                <dl className="summary">
                    <div><dt>{money(venue.pricePerHour, venue.currency)} × {check.minutes / 60} hrs</dt><dd>{money(total, venue.currency)}</dd></div>
                    <div className="total"><dt>Total</dt><dd>{money(total, venue.currency)}</dd></div>
                </dl>
            )}

            <button className="btn btn-block btn-lg" disabled={busy}>
                {busy ? 'Reserving…' : user ? 'Reserve & pay' : 'Sign in to book'}
            </button>
            <p className="muted small center">
                We hold your slot for a short time while you pay. You won't be charged until you complete checkout.
            </p>
        </form>
    )
}

export default function VenueDetails() {
    const { venueId } = useParams()
    const { data, error, loading, reload } = useAsync((signal) => venuesApi.get(venueId, signal), [venueId])
    useTitle(data?.venue?.name)

    if (loading) return <Spinner label="Loading venue…" />
    if (error?.status === 404 || error?.status === 400) {
        return (
            <div className="container section state-box">
                <h1>Venue not found</h1>
                <p className="muted">It may have been removed by its owner.</p>
                <Link to="/search" className="btn">Browse venues</Link>
            </div>
        )
    }
    if (error) return <div className="container section"><ErrorState error={error} onRetry={reload} /></div>

    const venue = data.venue
    return (
        <div className="container section">
            <BackLink to="/search">All venues</BackLink>
            <div className="detail-grid">
                <div>
                    <Gallery venue={venue} />
                    <h1 className="venue-title">{venue.name}</h1>
                    <p className="muted">📍 {venue.location}</p>
                    <div className="chips">
                        <span className="chip">👥 Up to {Number(venue.capacity).toLocaleString()} guests</span>
                        <span className="chip">💳 {money(venue.pricePerHour, venue.currency)} / hour</span>
                    </div>
                    <h2>About this venue</h2>
                    <p className="prose">{venue.description}</p>
                    <h2>Contact</h2>
                    <p>{venue.contact}</p>
                </div>
                <aside><BookingPanel venue={venue} /></aside>
            </div>
        </div>
    )
}
