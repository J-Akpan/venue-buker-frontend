import React, { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { bookingsApi, paymentsApi, venuesApi } from '../api'
import { parseError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useAsync, useTitle } from '../lib/hooks'
import { money, newKey, toLocalInput } from '../lib/format'
import { Alert, BackLink, ErrorState, Field, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import Icon from '../components/Icons'
import { VenuePlaceholder } from '../components/VenueCard'

const MIN_SLOT = 30
const MAX_DAYS = 14
export const PENDING_BOOKING_KEY = 'vb.pendingBooking'

const minimumStartDate = () => {
    const date = new Date(Date.now() + 60 * 60000)
    date.setMinutes(Math.ceil(date.getMinutes() / MIN_SLOT) * MIN_SLOT, 0, 0)
    return date
}

const validateBooking = (start, end, earliestStart) => {
    const valid = { problem: '', startProblem: '', endProblem: '', minutes: 0 }
    if (!start || !end) return valid

    const s = new Date(start)
    const e = new Date(end)
    if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) {
        return { ...valid, problem: 'Enter valid dates', startProblem: 'Enter a valid start time' }
    }

    const minutes = (e - s) / 60000
    if (s <= new Date()) {
        return { ...valid, minutes, problem: 'Start time must be in the future', startProblem: 'Start time must be in the future' }
    }
    if (s < earliestStart) {
        return { ...valid, minutes, problem: 'Choose a start time at least one hour from now', startProblem: 'Choose a start time at least one hour from now' }
    }
    if (s.getMinutes() % MIN_SLOT !== 0 || s.getSeconds() !== 0 || s.getMilliseconds() !== 0) {
        return { ...valid, minutes, problem: `Start time must be on a ${MIN_SLOT}-minute boundary`, startProblem: `Start time must be on a ${MIN_SLOT}-minute boundary` }
    }
    if (minutes <= 0) {
        return { ...valid, minutes, problem: 'End time must be after the start time', endProblem: 'End time must be after the start time' }
    }
    if (minutes % MIN_SLOT !== 0) {
        return { ...valid, minutes, problem: `Duration must be a multiple of ${MIN_SLOT} minutes`, endProblem: `Duration must be a multiple of ${MIN_SLOT} minutes` }
    }
    if (minutes > MAX_DAYS * 1440) {
        return { ...valid, minutes, problem: `Bookings can't exceed ${MAX_DAYS} days`, endProblem: `Bookings can't exceed ${MAX_DAYS} days` }
    }
    return { ...valid, minutes }
}

function Gallery({ venue }) {
    const pics = venue.pictures || []
    const [i, setI] = useState(0)
    const [broken, setBroken] = useState({})
    const ok = (n) => pics[n] && !broken[n]
    return (
        <div className="gallery">
            <div className="gallery-main">
                {ok(i) ? (
                    <img src={pics[i]} alt={`${venue.name} photo ${i + 1}`} onError={() => setBroken((b) => ({ ...b, [i]: true }))} />
                ) : (
                    <VenuePlaceholder venue={venue} />
                )}
            </div>
            {pics.length > 1 && (
                <div className="gallery-thumbs">
                    {pics.map((_, n) => (
                        <button key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-pressed={n === i}>
                            {ok(n) ? <img src={pics[n]} alt="" onError={() => setBroken((b) => ({ ...b, [n]: true }))} /> : <VenuePlaceholder venue={venue} />}
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

    const earliestStart = minimumStartDate()
    const minStart = toLocalInput(earliestStart)
    const check = validateBooking(start, end, earliestStart)

    const total = check.minutes > 0 && !check.problem ? (check.minutes / 60) * Number(venue.pricePerHour) : null

    const onStart = (v) => {
        setStart(v)
        // Convenience: default to a 2-hour booking once a start is chosen.
        if (v && !end) setEnd(toLocalInput(new Date(new Date(v).getTime() + 2 * 3600000)))
    }

    const submit = async (e) => {
        e.preventDefault()
        if (!user) return nav('/login', { state: { from: location.pathname } })
        if (!start || !end) return setError('Choose a start and end time')
        const currentCheck = validateBooking(start, end, minimumStartDate())
        if (currentCheck.problem) return setError(currentCheck.problem)
        setError('')
        setBusy(true)
        const body = { venueId: venue.venueId, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() }
        const sig = `${body.venueId}|${body.startsAt}|${body.endsAt}`
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
            <Field label="Starts" error={check.startProblem}>
                <input type="datetime-local" step={MIN_SLOT * 60} min={minStart} value={start} onChange={(e) => onStart(e.target.value)} required />
            </Field>
            <Field label="Ends" error={check.endProblem}>
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
    const { user } = useAuth()
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
                    <div className="venue-title-row">
                        <h1 className="venue-title">{venue.name}</h1>
                        {user?.userId === venue.ownerId && (
                            <Link to={`/owner?edit=${venue.venueId}`} className="btn btn-ghost btn-sm">Edit this venue</Link>
                        )}
                    </div>
                    <p className="venue-loc lg"><Icon name="pin" size={17} /> {venue.location}</p>
                    <div className="chips">
                        <span className="chip"><Icon name="users" size={15} /> Up to {Number(venue.capacity).toLocaleString()} guests</span>
                        <span className="chip"><Icon name="card" size={15} /> {money(venue.pricePerHour, venue.currency)} / hour</span>
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
