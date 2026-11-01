import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { bookingsApi, reviewsApi, venuesApi } from '../api'
import { parseError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime, money, newKey, toLocalInput } from '../lib/format'
import { Alert, BackLink, ErrorState, Field, Pagination, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import Icon from '../components/Icons'
import { VenuePlaceholder } from '../components/VenueCard'
import CancellationSchedule from '../components/CancellationSchedule'

const MIN_SLOT = 30
const MAX_DAYS = 14
const addOnUnitLabel = { flat: 'per item', per_person: 'per guest', per_hour: 'per hour' }
export const PENDING_BOOKING_KEY = 'vb.pendingBooking'

const minimumStartDate = () => {
    return new Date(Math.ceil((Date.now() + 1000) / 60000) * 60000)
}

const validateBooking = (start, end) => {
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

const availabilityRange = (start, end) => {
    const from = new Date(start)
    from.setHours(0, 0, 0, 0)
    const until = new Date(end && new Date(end) > new Date(start) ? end : start)
    until.setHours(0, 0, 0, 0)
    until.setDate(until.getDate() + 1)
    return { from: from.toISOString(), to: until.toISOString() }
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
                            {ok(n) ? <img src={pics[n]} alt="" loading="lazy" decoding="async" onError={() => setBroken((b) => ({ ...b, [n]: true }))} /> : <VenuePlaceholder venue={venue} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function BookingPanel({ venue }) {
    const { user } = useAuth()
    const toast = useToast()
    const nav = useNavigate()
    const location = useLocation()
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')
    const [eventType, setEventType] = useState('')
    const [attendeeCount, setAttendeeCount] = useState('')
    const [addOnQuantities, setAddOnQuantities] = useState({})
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [quote, setQuote] = useState(null)
    const [quoteFor, setQuoteFor] = useState('')
    const [quoteError, setQuoteError] = useState('')
    const [quoteLoading, setQuoteLoading] = useState(false)
    const [busySlots, setBusySlots] = useState([])
    const [availabilityFor, setAvailabilityFor] = useState('')
    const [availabilityError, setAvailabilityError] = useState('')
    const [availabilityLoading, setAvailabilityLoading] = useState(false)
    // One idempotency key per distinct request: a double-click or network retry returns the same booking.
    const keyRef = useRef({ sig: '', key: '' })

    const minStart = toLocalInput(minimumStartDate())
    const check = validateBooking(start, end)
    const selectedAddOns = (venue.addOns || []).flatMap((addOn) => {
        const quantity = Number(addOnQuantities[addOn.addOnId] || 0)
        return Number.isInteger(quantity) && quantity > 0 && quantity <= 1000 ? [{ addOnId: addOn.addOnId, quantity }] : []
    })
    const addOnQuantityProblem = Object.values(addOnQuantities).some((value) => value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 1000))
    const addOnSelectionProblem = selectedAddOns.length > 10
    const needsAttendeeCount = selectedAddOns.some(({ addOnId }) => venue.addOns.find((addOn) => addOn.addOnId === addOnId)?.chargeUnit === 'per_person')
    const attendeeCountNumber = Number(attendeeCount)
    const attendeeCountProblem = attendeeCount && (!Number.isInteger(attendeeCountNumber) || attendeeCountNumber < 1 || attendeeCountNumber > venue.capacity)
        ? `Enter a whole number from 1 to ${Number(venue.capacity).toLocaleString()}`
        : needsAttendeeCount && !attendeeCount ? 'Required for per-guest extras' : ''
    const selectedAddOnLines = selectedAddOns.map(({ addOnId, quantity }) => {
        const addOn = venue.addOns.find((item) => item.addOnId === addOnId)
        const durationHours = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000
        const multiplier = addOn.chargeUnit === 'per_hour' ? durationHours * quantity
            : addOn.chargeUnit === 'per_person' ? attendeeCountNumber * quantity
                : quantity
        return {
            addOnId,
            name: addOn.name,
            chargeUnit: addOn.chargeUnit,
            unitPrice: Number(addOn.price),
            quantity,
            lineTotal: Math.round(Number(addOn.price) * multiplier * 100) / 100,
        }
    })
    const params = start && end && !check.problem && !attendeeCountProblem && !addOnQuantityProblem && !addOnSelectionProblem
        ? {
            venueId: venue.venueId,
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(end).toISOString(),
            ...(eventType && { eventType }),
            ...(attendeeCount && { attendeeCount: Number(attendeeCount) }),
            ...(selectedAddOns.length && { addOns: selectedAddOns }),
        }
        : null
    const quoteKey = params ? JSON.stringify(params) : ''
    const availabilityKey = start && Number.isFinite(new Date(start).getTime())
        ? `${venue.venueId}|${JSON.stringify(availabilityRange(start, end))}`
        : ''

    useEffect(() => {
        const controller = new AbortController()
        if (!params) {
            setQuote(null)
            setQuoteFor('')
            setQuoteError('')
            setQuoteLoading(false)
            return () => controller.abort()
        }
        setQuote(null)
        setQuoteFor('')
        setQuoteError('')
        setQuoteLoading(true)
        const { addOns: _selectedAddOns, ...quoteParams } = params
        bookingsApi.quote(quoteParams, controller.signal)
            .then((result) => {
                const extrasTotal = selectedAddOnLines.reduce((sum, line) => sum + line.lineTotal, 0)
                setQuote({
                    ...result.quote,
                    priceBreakdown: {
                        ...result.quote.priceBreakdown,
                        amountDueNow: Math.round((Number(result.quote.priceBreakdown.amountDueNow) + extrasTotal) * 100) / 100,
                        addOns: selectedAddOnLines,
                    },
                })
                setQuoteFor(quoteKey)
            })
            .catch((err) => {
                if (controller.signal.aborted) return
                setQuoteError(parseError(err).message)
            })
            .finally(() => { if (!controller.signal.aborted) setQuoteLoading(false) })
        return () => controller.abort()
    }, [venue.venueId, quoteKey])

    useEffect(() => {
        const controller = new AbortController()
        if (!start || !Number.isFinite(new Date(start).getTime())) {
            setBusySlots([])
            setAvailabilityFor('')
            setAvailabilityError('')
            setAvailabilityLoading(false)
            return () => controller.abort()
        }
        setBusySlots([])
        setAvailabilityFor('')
        setAvailabilityError('')
        setAvailabilityLoading(true)
        bookingsApi.availability({ venueId: venue.venueId, ...availabilityRange(start, end) }, controller.signal)
            .then((result) => {
                setBusySlots(result.busySlots || [])
                setAvailabilityFor(availabilityKey)
            })
            .catch((err) => {
                if (controller.signal.aborted) return
                setAvailabilityError(parseError(err).message)
            })
            .finally(() => { if (!controller.signal.aborted) setAvailabilityLoading(false) })
        return () => controller.abort()
    }, [venue.venueId, availabilityKey])

    const quoteReady = Boolean(quote && quoteFor === quoteKey)
    const overlapsBusySlot = Boolean(availabilityFor === availabilityKey && start && end && busySlots.some((slot) => (
        new Date(start) < new Date(slot.endsAt) && new Date(end) > new Date(slot.startsAt)
    )))

    const onStart = (v) => {
        setStart(v)
        // Convenience: default to a 2-hour booking once a start is chosen.
        if (v && !end) setEnd(toLocalInput(new Date(new Date(v).getTime() + 2 * 3600000)))
    }

    const submit = async (e) => {
        e.preventDefault()
        if (!user) return nav('/login', { state: { from: location.pathname } })
        if (!start || !end) return setError('Choose a start and end time')
        const currentCheck = validateBooking(start, end)
        if (currentCheck.problem) return setError(currentCheck.problem)
        if (attendeeCountProblem) return setError(attendeeCountProblem)
        if (addOnQuantityProblem) return setError('Extra quantities must be whole numbers from 1 to 1,000.')
        if (overlapsBusySlot) return setError('That time overlaps a confirmed booking, pending owner request or payment hold.')
        if (!quoteReady) return setError(quoteError || 'Wait for the current price quote before requesting this booking.')
        setError('')
        setBusy(true)
        const body = {
            venueId: venue.venueId,
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(end).toISOString(),
            ...(eventType && { eventType }),
            ...(attendeeCount && { attendeeCount: Number(attendeeCount) }),
            ...(selectedAddOns.length && { addOns: selectedAddOns }),
        }
        const sig = `${body.venueId}|${body.startsAt}|${body.endsAt}|${body.eventType || ''}|${body.attendeeCount || ''}|${JSON.stringify(body.addOns || [])}`
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
        toast.success('Booking request sent to the venue.')
        nav(`/bookings/${booking.bookingId}`)
    }

    return (
        <form className="card booking-panel" onSubmit={submit} noValidate>
            <div className="price-line">
                <strong>{money(venue.pricePerHour, venue.currency)}</strong> <span className="muted">/ hour</span>
            </div>
            <Alert>{error || quoteError}</Alert>
            {venue.eventTypes?.length > 0 ? (
                <Field label="Event type">
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                        <option value="">Choose an event type (optional)</option>
                        {venue.eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                </Field>
            ) : (
                <Field label="Event type (optional)"><input value={eventType} onChange={(e) => setEventType(e.target.value)} maxLength={80} /></Field>
            )}
            <Field label={`Attendees${needsAttendeeCount ? '' : ' (optional)'}`} error={attendeeCountProblem} hint={`Venue capacity: ${Number(venue.capacity).toLocaleString()}`}>
                <input type="number" min="1" max={venue.capacity} step="1" value={attendeeCount} onChange={(e) => setAttendeeCount(e.target.value)} />
            </Field>
            {venue.addOns?.length > 0 && (
                <fieldset className="addon-options">
                    <legend>Optional extras</legend>
                    {venue.addOns.map((addOn) => {
                        const quantity = Number(addOnQuantities[addOn.addOnId] || 0)
                        const selected = quantity > 0
                        return (
                            <div className={`addon-option ${selected ? 'selected' : ''}`} key={addOn.addOnId}>
                                <label>
                                    <input type="checkbox" checked={selected} onChange={(e) => setAddOnQuantities((current) => {
                                        if (e.target.checked) return { ...current, [addOn.addOnId]: '1' }
                                        const next = { ...current }
                                        delete next[addOn.addOnId]
                                        return next
                                    })} />
                                    <span><strong>{addOn.name}</strong><small>{money(addOn.price, venue.currency)} {addOnUnitLabel[addOn.chargeUnit]}</small>
                                        {addOn.description && <small>{addOn.description}</small>}
                                    </span>
                                </label>
                                {selected && <Field label="Quantity"><input type="number" min="1" max="1000" step="1" value={addOnQuantities[addOn.addOnId]} onChange={(e) => setAddOnQuantities((current) => ({ ...current, [addOn.addOnId]: e.target.value }))} /></Field>}
                            </div>
                        )
                    })}
                    {addOnQuantityProblem && <small className="field-error">Extra quantities must be whole numbers from 1 to 1,000.</small>}
                    {addOnSelectionProblem && <small className="field-error">Choose up to 10 extras for one booking.</small>}
                </fieldset>
            )}
            <Field label="Starts" error={check.startProblem}>
                <input type="datetime-local" step={60} min={minStart} value={start} onChange={(e) => onStart(e.target.value)} required />
            </Field>
            <Field label="Ends" error={check.endProblem}>
                <input type="datetime-local" step={60} min={start || minStart} value={end} onChange={(e) => setEnd(e.target.value)} required />
            </Field>

            {availabilityLoading && <p className="muted small">Checking availability…</p>}
            {availabilityError && <p className="muted small">Availability could not be checked. The server will recheck the slot when you reserve.</p>}
            {overlapsBusySlot && <Alert type="warn">This time overlaps a confirmed booking, pending owner request or payment hold.</Alert>}
            {quoteLoading && <p className="muted small">Updating price…</p>}

            {quoteReady && (
                <dl className="summary">
                    <div><dt>Venue rental</dt><dd>{money(quote.priceBreakdown.venueRental, quote.priceBreakdown.currency)}</dd></div>
                    <div><dt>Cleaning fee</dt><dd>{money(quote.priceBreakdown.cleaningFee, quote.priceBreakdown.currency)}</dd></div>
                    {(quote.priceBreakdown.addOns || []).map((line) => <div key={line.addOnId}><dt>Extra · {line.name}</dt><dd>{money(line.lineTotal, quote.priceBreakdown.currency)}</dd></div>)}
                    <div className="total"><dt>Due now</dt><dd>{money(quote.priceBreakdown.amountDueNow, quote.priceBreakdown.currency)}</dd></div>
                    {Number(quote.priceBreakdown.refundableDepositDueToVenue) > 0 && (
                        <div><dt>Refundable deposit (due separately to venue)</dt><dd>{money(quote.priceBreakdown.refundableDepositDueToVenue, quote.priceBreakdown.currency)}</dd></div>
                    )}
                </dl>
            )}
            {quoteReady && quote.cancellationPolicy && <p className="muted small"><strong>Cancellation policy:</strong> {quote.cancellationPolicy}</p>}
            {quoteReady && <CancellationSchedule rules={quote.cancellationRules} />}
            {Number(venue.overtimePricePerHour) > 0 && <p className="muted small">Overtime: {money(venue.overtimePricePerHour, venue.currency)} per hour.</p>}

            <button className="btn btn-block btn-lg" disabled={busy || quoteLoading || !quoteReady || overlapsBusySlot}>
                {busy ? 'Sending request…' : user ? 'Request to book' : 'Sign in to book'}
            </button>
            <p className="muted small center">
                The venue owner reviews your request first. If accepted, you can pay securely online to confirm the booking.
            </p>
        </form>
    )
}

function ReviewSection({ venueId }) {
    const { user } = useAuth()
    const toast = useToast()
    const [page, setPage] = useState(1)
    const [rating, setRating] = useState('5')
    const [comment, setComment] = useState('')
    const [bookingId, setBookingId] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const reviews = useAsync((signal) => reviewsApi.forVenue(venueId, { page, limit: 5 }, signal), [venueId, page])
    const history = useAsync(
        (signal) => user ? bookingsApi.mine({ page: 1, limit: 100 }, signal) : Promise.resolve({ data: [] }),
        [venueId, user?.userId],
    )
    const eligible = (history.data?.data || []).filter((booking) => (
        booking.venueId === venueId && booking.status === 'confirmed' && new Date(booking.endsAt) <= new Date()
    ))

    const submit = async (event) => {
        event.preventDefault()
        setError('')
        if (!bookingId) return setError('Choose a completed booking to review.')
        setBusy(true)
        try {
            await reviewsApi.create({ bookingId, rating: Number(rating), ...(comment.trim() && { comment: comment.trim() }) })
            toast.success('Your review was published')
            setComment('')
            setBookingId('')
            setRating('5')
            reviews.reload()
        } catch (err) {
            setError(parseError(err).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="venue-reviews" aria-labelledby="reviews-heading">
            <div className="section-head">
                <h2 id="reviews-heading">Guest reviews</h2>
                {reviews.data && <span className="muted">{reviews.data.summary.reviewCount ? `${reviews.data.summary.averageRating} / 5 · ${reviews.data.summary.reviewCount} reviews` : 'No reviews yet'}</span>}
            </div>
            {user && (
                <form className="card review-form" onSubmit={submit}>
                    <h3>Review this venue</h3>
                    {error && <Alert>{error}</Alert>}
                    {history.error && <Alert>{history.error.message}</Alert>}
                    {history.loading ? <p className="muted small">Checking your completed bookings…</p> : eligible.length ? (
                        <>
                            <Field label="Completed booking">
                                <select value={bookingId} onChange={(e) => setBookingId(e.target.value)} required>
                                    <option value="">Choose a booking</option>
                                    {eligible.map((booking) => <option key={booking.bookingId} value={booking.bookingId}>{new Date(booking.startsAt).toLocaleDateString()} · {booking.bookingId.slice(0, 8).toUpperCase()}</option>)}
                                </select>
                            </Field>
                            <Field label="Rating">
                                <select value={rating} onChange={(e) => setRating(e.target.value)}>
                                    {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} out of 5</option>)}
                                </select>
                            </Field>
                            <Field label="Comment (optional)"><textarea rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
                            <button className="btn" disabled={busy || !bookingId}>{busy ? 'Publishing…' : 'Publish review'}</button>
                            <p className="muted small">Reviews are available after a confirmed event ends, once per booking.</p>
                        </>
                    ) : <p className="muted small">You can review this venue after a confirmed booking has ended.</p>}
                </form>
            )}
            {reviews.error ? <ErrorState error={reviews.error} onRetry={reviews.reload} /> : reviews.loading && !reviews.data ? <Spinner /> : reviews.data.data.length === 0 ? (
                <p className="muted">Be the first guest to leave a review.</p>
            ) : (
                <>
                    <div className="review-list">
                        {reviews.data.data.map((review) => (
                            <article className="card review-card" key={review.reviewId}>
                                <div className="row-between">
                                    <strong aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</strong>
                                    <span className="muted small">{new Date(review.createdAt).toLocaleDateString()}</span>
                                </div>
                                {review.comment && <p className="prose">{review.comment}</p>}
                                <span className="chip">Verified booking</span>
                            </article>
                        ))}
                    </div>
                    <Pagination meta={reviews.data.meta} onPage={setPage} />
                </>
            )}
        </section>
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
                        {venue.isVerified && <span className="chip">Verified venue</span>}
                        {venue.availabilityConfirmedAt && <span className="chip">Owner checked availability {dateTime(venue.availabilityConfirmedAt)}</span>}
                    </div>
                    {venue.eventTypes?.length > 0 && <p><strong>Events:</strong> {venue.eventTypes.join(', ')}</p>}
                    {venue.amenities?.length > 0 && <p><strong>Amenities:</strong> {venue.amenities.join(', ')}</p>}
                    <h2>About this venue</h2>
                    <p className="prose">{venue.description}</p>
                    {(venue.cancellationPolicy || venue.cancellationRules?.length > 0) && <>
                        <h2>Cancellation policy</h2>
                        {venue.cancellationPolicy && <p className="prose">{venue.cancellationPolicy}</p>}
                        <CancellationSchedule rules={venue.cancellationRules} />
                    </>}
                    <h2>Contact</h2>
                    <p>{venue.contact}</p>
                    <ReviewSection venueId={venue.venueId} />
                </div>
                <aside><BookingPanel venue={venue} /></aside>
            </div>
        </div>
    )
}
