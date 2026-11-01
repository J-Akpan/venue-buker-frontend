import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { bookingsApi, venuesApi } from '../api'
import { parseError } from '../api/client'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime, money } from '../lib/format'
import Icon from '../components/Icons'
import { Alert, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, Spinner, StatusBadge } from '../components/ui'
import { VenueImage } from '../components/VenueCard'
import { effectiveStatus } from '../components/BookingParts'
import { useToast } from '../components/Toast'

const blank = {
    name: '', description: '', location: '', capacity: '', pricePerHour: '', currency: 'NGN', contact: '', pictures: '',
    cleaningFee: '0', refundableDeposit: '0', overtimePricePerHour: '0', eventTypes: '', amenities: '', cancellationPolicy: '',
}

const splitList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean)
const isHttpsUrl = (value) => {
    try { return new URL(value).protocol === 'https:' } catch { return false }
}
const validAmount = (value) => {
    const amount = Number(value)
    const cents = amount * 100
    return value !== '' && Number.isFinite(amount) && amount >= 0 && amount <= 10_000_000 && Math.abs(cents - Math.round(cents)) < 1e-8
}

const toForm = (v) => ({
    name: v.name,
    description: v.description,
    location: v.location,
    capacity: String(v.capacity),
    pricePerHour: String(v.pricePerHour),
    currency: v.currency,
    contact: v.contact,
    pictures: (v.pictures || []).join('\n'),
    cleaningFee: String(v.cleaningFee ?? 0),
    refundableDeposit: String(v.refundableDeposit ?? 0),
    overtimePricePerHour: String(v.overtimePricePerHour ?? 0),
    eventTypes: (v.eventTypes || []).join(', '),
    amenities: (v.amenities || []).join(', '),
    cancellationPolicy: v.cancellationPolicy || '',
})

function VenueForm({ venue, onClose, onSaved }) {
    const toast = useToast()
    const editing = !!venue
    const [form, setForm] = useState(venue ? toForm(venue) : blank)
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

    const submit = async (e) => {
        e.preventDefault()
        const pictures = form.pictures.split('\n').map((s) => s.trim()).filter(Boolean)
        const eventTypes = splitList(form.eventTypes)
        const amenities = splitList(form.amenities)
        const v = {}
        if (!form.name.trim()) v.name = 'Required'
        if (!form.description.trim()) v.description = 'Required'
        if (!form.location.trim()) v.location = 'Required'
        if (!form.contact.trim()) v.contact = 'Required'
        if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1 || Number(form.capacity) > 1_000_000) v.capacity = 'Enter a whole number from 1 to 1,000,000'
        if (!validAmount(form.pricePerHour)) v.pricePerHour = 'Enter a price from 0 to 10,000,000 with up to 2 decimals'
        for (const [key, label] of [['cleaningFee', 'Cleaning fee'], ['refundableDeposit', 'Refundable deposit'], ['overtimePricePerHour', 'Overtime rate']]) {
            const value = form[key]
            if (!validAmount(value)) v[key] = `${label} must be from 0 to 10,000,000 with up to 2 decimals`
        }
        if (pictures.length > 10) v.pictures = 'At most 10 images'
        else if (pictures.some((p) => !isHttpsUrl(p))) v.pictures = 'Each image must be a valid https:// link, one per line'
        if (eventTypes.length > 20 || new Set(eventTypes).size !== eventTypes.length || eventTypes.some((item) => item.length < 2 || item.length > 60)) v.eventTypes = 'Use up to 20 unique event types, each 2-60 characters'
        if (amenities.length > 40 || new Set(amenities).size !== amenities.length || amenities.some((item) => item.length < 2 || item.length > 60)) v.amenities = 'Use up to 40 unique amenities, each 2-60 characters'
        setErrors(v)
        setError('')
        if (Object.keys(v).length) return

        const body = {
            name: form.name.trim(),
            description: form.description.trim(),
            location: form.location.trim(),
            contact: form.contact.trim(),
            capacity: Number(form.capacity),
            pricePerHour: Number(form.pricePerHour),
            cleaningFee: Number(form.cleaningFee),
            refundableDeposit: Number(form.refundableDeposit),
            overtimePricePerHour: Number(form.overtimePricePerHour),
            eventTypes,
            amenities,
            cancellationPolicy: form.cancellationPolicy.trim() || null,
            pictures,
            ...(editing ? {} : { currency: form.currency }), // currency is fixed once a venue exists
        }
        setBusy(true)
        try {
            if (editing) await venuesApi.update(venue.venueId, body)
            else await venuesApi.create(body)
            toast.success(editing ? 'Venue updated' : 'Venue created')
            onSaved()
        } catch (err) {
            const p = parseError(err)
            setErrors(p.fields)
            setError(p.code === 'CONFLICT' ? 'You already have a venue with that name.' : p.message)
            setBusy(false)
        }
    }

    return (
        <Modal open title={editing ? 'Edit venue' : 'Add a venue'} onClose={busy ? () => {} : onClose}>
            <form onSubmit={submit} noValidate className="stack-sm">
                <Alert>{error}</Alert>
                <Field label="Venue name" error={errors.name}><input value={form.name} onChange={set('name')} maxLength={120} /></Field>
                <Field label="Location" error={errors.location} hint="City and area, e.g. Lekki, Lagos"><input value={form.location} onChange={set('location')} maxLength={160} /></Field>
                <Field label="Description" error={errors.description}><textarea rows={4} value={form.description} onChange={set('description')} maxLength={5000} /></Field>
                <div className="form-grid">
                    <Field label="Capacity (guests)" error={errors.capacity}><input type="number" min="1" max="1000000" step="1" inputMode="numeric" value={form.capacity} onChange={set('capacity')} /></Field>
                    <Field label="Price per hour" error={errors.pricePerHour}><input type="number" min="0" max="10000000" step="0.01" inputMode="decimal" value={form.pricePerHour} onChange={set('pricePerHour')} /></Field>
                    <Field label="Currency" hint={editing ? 'Cannot be changed after creation' : undefined}>
                        <select value={form.currency} onChange={set('currency')} disabled={editing}>
                            <option>USD</option>
                            <option>NGN</option>
                        </select>
                    </Field>
                    <Field label="Contact (phone or email)" error={errors.contact}><input value={form.contact} onChange={set('contact')} maxLength={64} /></Field>
                    <Field label="Cleaning fee" error={errors.cleaningFee}><input type="number" min="0" max="10000000" step="0.01" value={form.cleaningFee} onChange={set('cleaningFee')} /></Field>
                    <Field label="Refundable deposit" error={errors.refundableDeposit} hint="Due separately to you; it is not part of online checkout."><input type="number" min="0" max="10000000" step="0.01" value={form.refundableDeposit} onChange={set('refundableDeposit')} /></Field>
                    <Field label="Overtime price per hour" error={errors.overtimePricePerHour}><input type="number" min="0" max="10000000" step="0.01" value={form.overtimePricePerHour} onChange={set('overtimePricePerHour')} /></Field>
                </div>
                <Field label="Event types" error={errors.eventTypes} hint="Comma separated, up to 20. Leave blank for any event type."><input value={form.eventTypes} onChange={set('eventTypes')} maxLength={1400} /></Field>
                <Field label="Amenities" error={errors.amenities} hint="Comma separated, up to 40."><input value={form.amenities} onChange={set('amenities')} maxLength={2600} /></Field>
                <Field label="Cancellation policy" error={errors.cancellationPolicy}><textarea rows={3} value={form.cancellationPolicy} onChange={set('cancellationPolicy')} maxLength={2000} /></Field>
                <Field label="Photo links (https, one per line, max 10)" error={errors.pictures}>
                    <textarea rows={3} value={form.pictures} onChange={set('pictures')} placeholder="https://…" />
                </Field>
                <div className="modal-foot-inline">
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create venue'}</button>
                </div>
            </form>
        </Modal>
    )
}

function VenueBookings({ venue, onClose }) {
    const [page, setPage] = useState(1)
    const { data, error, loading, reload } = useAsync(() => bookingsApi.forVenue(venue.venueId, { page, limit: 10 }), [venue.venueId, page])
    return (
        <Modal open title={`Bookings · ${venue.name}`} onClose={onClose}>
            {error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : loading && !data ? (
                <Spinner />
            ) : data.data.length === 0 ? (
                <p className="muted">No bookings for this venue yet.</p>
            ) : (
                <>
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>When</th><th>Due now</th><th>Status</th></tr></thead>
                            <tbody>
                                {data.data.map((b) => (
                                    <tr key={b.bookingId}>
                                        <td>{dateTime(b.startsAt)}<br /><span className="muted small">to {dateTime(b.endsAt)}</span></td>
                                        <td>{money(b.totalPrice, b.currency)}</td>
                                        <td><StatusBadge status={effectiveStatus(b)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={data.meta} onPage={setPage} />
                </>
            )}
        </Modal>
    )
}

export default function OwnerDashboard() {
    useTitle('My venues')
    const toast = useToast()
    const [page, setPage] = useState(1)
    const { data, error, loading, reload } = useAsync(() => venuesApi.mine({ page, limit: 12 }), [page])
    const [editing, setEditing] = useState(null) // venue | 'new' | null
    const [viewing, setViewing] = useState(null)
    const [deleting, setDeleting] = useState(null)
    const [busy, setBusy] = useState(false)
    const [confirming, setConfirming] = useState('')
    const [params, setParams] = useSearchParams()

    // "Edit this venue" on a venue page links here with ?edit=<venueId>.
    const editId = params.get('edit')
    useEffect(() => {
        if (!editId || !data) return
        const match = data.data.find((v) => v.venueId === editId)
        if (match) setEditing(match)
        else venuesApi.get(editId).then((r) => setEditing(r.venue)).catch(() => {}) // not on this page of the list
        setParams((p) => { p.delete('edit'); return p }, { replace: true })
    }, [editId, data]) // eslint-disable-line react-hooks/exhaustive-deps

    const remove = async () => {
        setBusy(true)
        try {
            await venuesApi.remove(deleting.venueId)
            toast.success('Venue removed')
            setDeleting(null)
            reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setBusy(false)
        }
    }

    const confirmAvailability = async (venue) => {
        setConfirming(venue.venueId)
        try {
            await venuesApi.confirmAvailability(venue.venueId)
            toast.success('Availability confirmed')
            reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setConfirming('')
        }
    }

    return (
        <div className="container section">
            <PageHeader
                title="My venues"
                subtitle="Manage your listings and see who has booked."
                actions={<button className="btn" onClick={() => setEditing('new')}>+ Add venue</button>}
            />
            {error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : loading && !data ? (
                <Spinner />
            ) : data.data.length === 0 ? (
                <EmptyState title="You haven't listed a venue yet" action={<button className="btn" onClick={() => setEditing('new')}>Add your first venue</button>}>
                    Listings appear in search as soon as you save them.
                </EmptyState>
            ) : (
                <>
                    <div className="owner-grid">
                        {data.data.map((v) => (
                            <article className="card owner-card" key={v.venueId}>
                                <div className="owner-card-img"><VenueImage venue={v} /></div>
                                <h3>{v.name}</h3>
                                <p className="venue-loc small"><Icon name="pin" size={14} /> {v.location} <span aria-hidden>·</span> <Icon name="users" size={14} /> {v.capacity} <span aria-hidden>·</span> {money(v.pricePerHour, v.currency)}/hr</p>
                                <p className="owner-venue-status">
                                    <span className="chip">{v.isVerified ? 'Verified' : 'Awaiting verification'}</span>
                                    <span className="muted small">{v.availabilityConfirmedAt ? `Availability checked ${dateTime(v.availabilityConfirmedAt)}` : 'Availability not confirmed yet'}</span>
                                </p>
                                <div className="row-gap">
                                    <button className="btn btn-sm" onClick={() => setViewing(v)}>Bookings</button>
                                    <button className="btn btn-ghost btn-sm" disabled={confirming === v.venueId} onClick={() => confirmAvailability(v)}>{confirming === v.venueId ? 'Confirming…' : 'Confirm availability'}</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(v)}>Edit</button>
                                    <Link className="btn btn-ghost btn-sm" to={`/venues/${v.venueId}`}>View</Link>
                                    <button className="btn btn-ghost btn-sm danger-text" onClick={() => setDeleting(v)}>Delete</button>
                                </div>
                            </article>
                        ))}
                    </div>
                    <Pagination meta={data.meta} onPage={setPage} />
                </>
            )}

            {editing && (
                <VenueForm
                    venue={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); reload() }}
                />
            )}
            {viewing && <VenueBookings venue={viewing} onClose={() => setViewing(null)} />}
            <ConfirmDialog
                open={!!deleting}
                danger
                busy={busy}
                title="Delete this venue?"
                confirmLabel="Delete venue"
                message={`"${deleting?.name}" will no longer appear in search. Existing bookings are kept.`}
                onConfirm={remove}
                onClose={() => setDeleting(null)}
            />
        </div>
    )
}
