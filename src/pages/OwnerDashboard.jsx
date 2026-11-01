import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { bookingsApi, paymentsApi, venuesApi } from '../api'
import { parseError } from '../api/client'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime, money } from '../lib/format'
import Icon from '../components/Icons'
import { Alert, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, Spinner, StatusBadge } from '../components/ui'
import { VenueImage } from '../components/VenueCard'
import { effectiveStatus, HoldTimer } from '../components/BookingParts'
import { useToast } from '../components/Toast'

const blank = {
    name: '', description: '', location: '', capacity: '', pricePerHour: '', currency: 'NGN', contact: '', pictures: '',
    cleaningFee: '0', refundableDeposit: '0', overtimePricePerHour: '0', eventTypes: '', amenities: '', cancellationPolicy: '',
    addOns: [],
    cancellationRules: [{ noticeHours: '0', refundPercent: '100' }],
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
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const PHOTO_UPLOAD_CONCURRENCY = 3

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
    addOns: (v.addOns || []).map((addOn) => ({
        addOnId: addOn.addOnId,
        name: addOn.name || '',
        description: addOn.description || '',
        price: String(addOn.price ?? ''),
        chargeUnit: addOn.chargeUnit || 'flat',
    })),
    cancellationPolicy: v.cancellationPolicy || '',
    cancellationRules: (v.cancellationRules?.length ? v.cancellationRules : [{ noticeHours: 0, refundPercent: 100 }])
        .map((rule) => ({ noticeHours: String(rule.noticeHours), refundPercent: String(rule.refundPercent) })),
})

function VenueForm({ venue, onClose, onSaved }) {
    const toast = useToast()
    const editing = !!venue
    const [form, setForm] = useState(venue ? toForm(venue) : blank)
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState([])
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
    const updateRule = (index, key, value) => setForm((f) => ({
        ...f,
        cancellationRules: f.cancellationRules.map((rule, i) => i === index ? { ...rule, [key]: value } : rule),
    }))
    const updateAddOn = (index, key, value) => setForm((f) => ({
        ...f,
        addOns: f.addOns.map((addOn, i) => i === index ? { ...addOn, [key]: value } : addOn),
    }))

    const submit = async (e) => {
        e.preventDefault()
        const pictures = form.pictures.split('\n').map((s) => s.trim()).filter(Boolean)
        const eventTypes = splitList(form.eventTypes)
        const amenities = splitList(form.amenities)
        const cancellationRules = form.cancellationRules.map(({ noticeHours, refundPercent }) => ({
            noticeHours: Number(noticeHours),
            refundPercent: Number(refundPercent),
        }))
        const addOns = form.addOns.map((addOn) => ({
            addOnId: addOn.addOnId || globalThis.crypto.randomUUID(),
            name: addOn.name.trim(),
            description: addOn.description.trim() || null,
            price: Number(addOn.price),
            chargeUnit: addOn.chargeUnit,
        }))
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
        if (pictures.length + selectedFiles.length > 10) v.pictures = 'At most 10 images, including uploads'
        else if (pictures.some((p) => !isHttpsUrl(p))) v.pictures = 'Each image must be a valid https:// link, one per line'
        else if (selectedFiles.some((file) => file.size > MAX_PHOTO_BYTES)) v.pictures = 'Each uploaded photo must be 10 MB or smaller'
        if (eventTypes.length > 20 || new Set(eventTypes).size !== eventTypes.length || eventTypes.some((item) => item.length < 2 || item.length > 60)) v.eventTypes = 'Use up to 20 unique event types, each 2-60 characters'
        if (amenities.length > 40 || new Set(amenities).size !== amenities.length || amenities.some((item) => item.length < 2 || item.length > 60)) v.amenities = 'Use up to 40 unique amenities, each 2-60 characters'
        if (addOns.length > 30) v.addOns = 'Add up to 30 extras'
        else if (addOns.some((addOn, index) => addOn.name.length < 2 || addOn.name.length > 100 || form.addOns[index].description.length > 500)) v.addOns = 'Each extra needs a 2-100 character name and a description under 500 characters'
        else if (addOns.some((addOn, index) => !validAmount(form.addOns[index].price))) v.addOns = 'Each extra needs a price from 0 to 10,000,000 with up to 2 decimals'
        else if (addOns.some((addOn) => !['flat', 'per_person', 'per_hour'].includes(addOn.chargeUnit))) v.addOns = 'Choose a valid price unit for each extra'
        if (!cancellationRules.length || cancellationRules.length > 8) v.cancellationRules = 'Add between 1 and 8 refund rules'
        else if (cancellationRules.some((rule, i) => !/^\d+$/.test(form.cancellationRules[i].noticeHours) || rule.noticeHours < 0 || rule.noticeHours > 8760)) v.cancellationRules = 'Notice must be a whole number of hours from 0 to 8,760'
        else if (cancellationRules.some((rule, i) => !/^\d+$/.test(form.cancellationRules[i].refundPercent) || rule.refundPercent < 0 || rule.refundPercent > 100)) v.cancellationRules = 'Refund must be a whole percentage from 0 to 100'
        else if (new Set(cancellationRules.map((rule) => rule.noticeHours)).size !== cancellationRules.length) v.cancellationRules = 'Each rule needs a unique notice period'
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
            addOns,
            cancellationPolicy: form.cancellationPolicy.trim() || null,
            cancellationRules,
            pictures,
            ...(editing ? {} : { currency: form.currency }), // currency is fixed once a venue exists
        }
        setBusy(true)
        try {
            if (editing && selectedFiles.length) {
                setUploading(true)
                const uploadedPictures = new Array(selectedFiles.length)
                const uploadOne = async (file) => {
                    const signature = await venuesApi.imageUploadSignature(venue.venueId)
                    const payload = new FormData()
                    payload.append('file', file)
                    payload.append('api_key', signature.apiKey)
                    payload.append('timestamp', String(signature.timestamp))
                    payload.append('signature', signature.signature)
                    for (const key of ['allowed_formats', 'folder', 'overwrite', 'public_id', 'unique_filename']) {
                        payload.append(key, String(signature[key]))
                    }
                    const response = await fetch(signature.uploadUrl, { method: 'POST', body: payload })
                    const result = await response.json().catch(() => ({}))
                    if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'A photo could not be uploaded.')
                    return result.secure_url
                }
                let nextFile = 0
                let uploadError = null
                const worker = async () => {
                    while (!uploadError && nextFile < selectedFiles.length) {
                        const index = nextFile++
                        try {
                            uploadedPictures[index] = await uploadOne(selectedFiles[index])
                        } catch (err) {
                            uploadError ||= err
                        }
                    }
                }
                const workers = Math.min(PHOTO_UPLOAD_CONCURRENCY, selectedFiles.length)
                await Promise.all(Array.from({ length: workers }, worker))
                if (uploadError) throw uploadError
                body.pictures = [...pictures, ...uploadedPictures]
            }
            if (editing) await venuesApi.update(venue.venueId, body)
            else await venuesApi.create(body)
            toast.success(editing ? 'Venue updated' : 'Venue created')
            onSaved()
        } catch (err) {
            const p = parseError(err)
            setErrors(p.fields)
            setError(p.code === 'CONFLICT' ? 'You already have a venue with that name.' : p.message)
            setUploading(false)
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
                <div className="field">
                    <div className="row-between">
                        <strong>Optional extras</strong>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={form.addOns.length >= 30} onClick={() => setForm((f) => ({ ...f, addOns: [...f.addOns, { name: '', description: '', price: '', chargeUnit: 'flat' }] }))}>Add extra</button>
                    </div>
                    <small className="muted">Offer equipment, services or other bookable extras. Prices are added to the booking quote.</small>
                    {errors.addOns && <small className="field-error">{errors.addOns}</small>}
                    <div className="addon-editor-list">
                        {form.addOns.map((addOn, index) => (
                            <div className="addon-editor-row" key={addOn.addOnId || index}>
                                <Field label="Name"><input value={addOn.name} onChange={(e) => updateAddOn(index, 'name', e.target.value)} maxLength={100} /></Field>
                                <Field label="Price"><input type="number" min="0" max="10000000" step="0.01" value={addOn.price} onChange={(e) => updateAddOn(index, 'price', e.target.value)} /></Field>
                                <Field label="Charge unit">
                                    <select value={addOn.chargeUnit} onChange={(e) => updateAddOn(index, 'chargeUnit', e.target.value)}>
                                        <option value="flat">Per item</option>
                                        <option value="per_person">Per guest</option>
                                        <option value="per_hour">Per hour</option>
                                    </select>
                                </Field>
                                <Field label="Description (optional)"><input value={addOn.description} onChange={(e) => updateAddOn(index, 'description', e.target.value)} maxLength={500} /></Field>
                                <button type="button" className="btn btn-ghost btn-sm danger-text" onClick={() => setForm((f) => ({ ...f, addOns: f.addOns.filter((_, i) => i !== index) }))} aria-label={`Remove extra ${index + 1}`}>Remove</button>
                            </div>
                        ))}
                    </div>
                </div>
                <Field label="Cancellation policy" error={errors.cancellationPolicy}><textarea rows={3} value={form.cancellationPolicy} onChange={set('cancellationPolicy')} maxLength={2000} /></Field>
                <div className="field">
                    <div className="row-between">
                        <strong>Cancellation refund rules</strong>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={form.cancellationRules.length >= 8} onClick={() => setForm((f) => ({ ...f, cancellationRules: [...f.cancellationRules, { noticeHours: '', refundPercent: '' }] }))}>Add rule</button>
                    </div>
                    <small className="muted">Set the refund percentage for cancellations made at least this many hours before the event. The closest matching notice period applies.</small>
                    {errors.cancellationRules && <small className="field-error">{errors.cancellationRules}</small>}
                    <div className="cancellation-rule-list">
                        {form.cancellationRules.map((rule, index) => (
                            <div className="cancellation-rule-row" key={index}>
                                <Field label={`Notice period ${index + 1}`}>
                                    <input type="number" min="0" max="8760" step="1" inputMode="numeric" value={rule.noticeHours} onChange={(e) => updateRule(index, 'noticeHours', e.target.value)} aria-label={`Notice period ${index + 1} in hours`} />
                                </Field>
                                <Field label="Refund percentage">
                                    <div className="input-suffix"><input type="number" min="0" max="100" step="1" inputMode="numeric" value={rule.refundPercent} onChange={(e) => updateRule(index, 'refundPercent', e.target.value)} aria-label={`Refund percentage for rule ${index + 1}`} /><span>%</span></div>
                                </Field>
                                <button type="button" className="btn btn-ghost btn-sm danger-text" disabled={form.cancellationRules.length <= 1} onClick={() => setForm((f) => ({ ...f, cancellationRules: f.cancellationRules.filter((_, i) => i !== index) }))} aria-label={`Remove refund rule ${index + 1}`}>Remove</button>
                            </div>
                        ))}
                    </div>
                </div>
                <Field label="Photo links (https, one per line, max 10)" error={errors.pictures}>
                    <textarea rows={3} value={form.pictures} onChange={set('pictures')} placeholder="https://…" />
                </Field>
                {editing ? (
                    <Field label="Upload photos" hint="JPG, PNG or WebP, up to 10 MB each. New photos are added to the links above when you save.">
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} />
                        {selectedFiles.length > 0 && <small className="muted">{selectedFiles.length} photo{selectedFiles.length === 1 ? '' : 's'} selected</small>}
                    </Field>
                ) : <p className="muted small">Create the venue first to upload photos directly; you can also add secure photo links now.</p>}
                <div className="modal-foot-inline">
                    <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn" disabled={busy}>{busy ? uploading ? 'Uploading photos…' : 'Saving…' : editing ? 'Save changes' : 'Create venue'}</button>
                </div>
            </form>
        </Modal>
    )
}

function VenueBookings({ venue, onClose }) {
    const [page, setPage] = useState(1)
    const { data, error, loading, reload } = useAsync((signal) => bookingsApi.forVenue(venue.venueId, { page, limit: 10 }, signal), [venue.venueId, page])
    const analytics = useAsync((signal) => bookingsApi.analytics(venue.venueId, {}, signal), [venue.venueId])
    const toast = useToast()
    const [busyId, setBusyId] = useState('')
    const [decliningId, setDecliningId] = useState('')
    const [declineReason, setDeclineReason] = useState('')

    const accept = async (booking) => {
        setBusyId(booking.bookingId)
        try {
            await bookingsApi.accept(booking.bookingId)
            toast.success('Booking request accepted. The guest can now pay.')
            reload()
            analytics.reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setBusyId('')
        }
    }

    const decline = async (booking) => {
        setBusyId(booking.bookingId)
        try {
            await bookingsApi.decline(booking.bookingId, declineReason)
            toast.success('Booking request declined.')
            setDecliningId('')
            setDeclineReason('')
            reload()
            analytics.reload()
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setBusyId('')
        }
    }

    return (
        <Modal open title={`Bookings · ${venue.name}`} onClose={onClose}>
            <section className="venue-analytics" aria-label="Last 30 days booking analytics">
                <div className="row-between"><h3>Booking overview</h3><span className="muted small">Last 30 days</span></div>
                {analytics.error ? (
                    <div className="row-gap"><span className="muted small">{analytics.error.message}</span><button className="btn btn-ghost btn-sm" onClick={analytics.reload}>Retry</button></div>
                ) : analytics.loading && !analytics.data ? (
                    <p className="muted small">Loading booking overview…</p>
                ) : analytics.data && (
                    <div className="venue-analytics-grid">
                        <div><small>Requests</small><strong>{analytics.data.analytics.requests}</strong></div>
                        <div><small>Confirmed</small><strong>{analytics.data.analytics.confirmed}</strong></div>
                        <div><small>Declined</small><strong>{analytics.data.analytics.declined}</strong></div>
                        <div><small>Conversion</small><strong>{analytics.data.analytics.conversionPercent}%</strong></div>
                        <div><small>Avg. response</small><strong>{analytics.data.analytics.averageOwnerResponseMinutes == null ? '—' : `${analytics.data.analytics.averageOwnerResponseMinutes} min`}</strong></div>
                        <div><small>Confirmed value</small><strong>{money(analytics.data.analytics.confirmedGross, venue.currency)}</strong></div>
                    </div>
                )}
            </section>
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
                            <thead><tr><th>When</th><th>Due now</th><th>Status</th><th>Manage request</th></tr></thead>
                            <tbody>
                                {data.data.map((b) => (
                                    <tr key={b.bookingId}>
                                        <td>{dateTime(b.startsAt)}<br /><span className="muted small">to {dateTime(b.endsAt)}</span></td>
                                        <td>{money(b.totalPrice, b.currency)}</td>
                                        <td>
                                            <StatusBadge status={effectiveStatus(b)} />
                                            {b.status === 'requested' && <div className="small"><HoldTimer expiresAt={b.expiresAt} label="Respond in" onExpire={reload} /></div>}
                                        </td>
                                        <td>
                                            {effectiveStatus(b) === 'requested' && (decliningId === b.bookingId ? (
                                                <div className="decline-request-actions">
                                                    <Field label="Reason for declining (optional)"><textarea rows={2} maxLength={500} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} /></Field>
                                                    <div className="row-gap">
                                                        <button className="btn btn-sm danger-text" disabled={busyId === b.bookingId} onClick={() => decline(b)}>{busyId === b.bookingId ? 'Declining…' : 'Confirm decline'}</button>
                                                        <button className="btn btn-ghost btn-sm" disabled={busyId === b.bookingId} onClick={() => { setDecliningId(''); setDeclineReason('') }}>Keep request</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="row-gap">
                                                    <button className="btn btn-sm" disabled={busyId === b.bookingId} onClick={() => accept(b)}>{busyId === b.bookingId ? 'Saving…' : 'Accept'}</button>
                                                    <button className="btn btn-ghost btn-sm danger-text" disabled={busyId === b.bookingId} onClick={() => { setDeclineReason(''); setDecliningId(b.bookingId) }}>Decline</button>
                                                </div>
                                            ))}
                                            {b.status === 'pending' && <span className="muted small">Accepted · awaiting payment</span>}
                                        </td>
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

function PayoutsPanel({ venues }) {
    const toast = useToast()
    const status = useAsync((signal) => paymentsApi.connectStatus(signal), [])
    const settlements = useAsync((signal) => paymentsApi.settlements({ page: 1, limit: 5 }, signal), [])
    const [busy, setBusy] = useState(false)
    const venueNames = Object.fromEntries(venues.map((venue) => [venue.venueId, venue.name]))

    const startOnboarding = async () => {
        setBusy(true)
        try {
            const result = await paymentsApi.connectOnboarding()
            window.location.assign(result.url)
        } catch (err) {
            toast.error(parseError(err).message)
            setBusy(false)
        }
    }

    return (
        <section className="card owner-payouts" aria-label="Venue payouts">
            <div className="row-between owner-payouts-heading">
                <div><h2>Venue payouts</h2><p className="muted small">Connect Stripe to receive payments for accepted bookings.</p></div>
                {status.data?.enabled && (
                    <button className="btn btn-sm" disabled={busy} onClick={startOnboarding}>
                        {busy ? 'Opening Stripe…' : status.data.account?.ready ? 'Manage payout details' : 'Set up payouts'}
                    </button>
                )}
            </div>
            {status.error ? (
                <div className="row-gap"><span className="muted small">{status.error.message}</span><button className="btn btn-ghost btn-sm" onClick={status.reload}>Retry</button></div>
            ) : status.loading && !status.data ? (
                <p className="muted small">Checking payout setup…</p>
            ) : status.data && !status.data.enabled ? (
                <p className="muted small">Payout setup is not enabled yet. You can still manage bookings while the payment account is configured.</p>
            ) : status.data?.account?.ready ? (
                <p className="payout-status payout-status-ready"><span aria-hidden>✓</span> Payout account is ready to receive booking payments.</p>
            ) : status.data?.enabled ? (
                <p className="payout-status">Complete Stripe’s secure setup before guests can pay for your bookings.</p>
            ) : null}
            {settlements.data?.data?.length > 0 && (
                <div className="table-wrap owner-settlements">
                    <table className="table">
                        <thead><tr><th>Venue</th><th>Gross</th><th>Venue amount</th><th>Refunded</th><th>Status</th></tr></thead>
                        <tbody>{settlements.data.data.map((row) => (
                            <tr key={row.settlementId}>
                                <td>{venueNames[row.venueId] || 'Venue'}<br /><span className="muted small">{dateTime(row.createdAt)}</span></td>
                                <td>{money(row.grossAmount, row.currency)}</td>
                                <td>{money(row.venueAmount, row.currency)}</td>
                                <td>{money(row.refundedAmount, row.currency)}</td>
                                <td><span className="chip">{row.status.replaceAll('_', ' ')}</span></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
            {settlements.error && <p className="muted small">Recent settlement history is unavailable. <button className="text-button" onClick={settlements.reload}>Retry</button></p>}
        </section>
    )
}

export default function OwnerDashboard() {
    useTitle('My venues')
    const toast = useToast()
    const [page, setPage] = useState(1)
    const { data, error, loading, reload } = useAsync((signal) => venuesApi.mine({ page, limit: 12 }, signal), [page])
    const [editing, setEditing] = useState(null) // venue | 'new' | null
    const [viewing, setViewing] = useState(null)
    const [deleting, setDeleting] = useState(null)
    const [busy, setBusy] = useState(false)
    const [confirming, setConfirming] = useState('')
    const [calendarBusy, setCalendarBusy] = useState('')
    const [calendar, setCalendar] = useState(null)
    const [params, setParams] = useSearchParams()

    // "Edit this venue" on a venue page links here with ?edit=<venueId>.
    const editId = params.get('edit')
    useEffect(() => {
        if (!editId || !data) return
        const controller = new AbortController()
        const clearEditParam = () => setParams((p) => { p.delete('edit'); return p }, { replace: true })
        const match = data.data.find((v) => v.venueId === editId)
        if (match) {
            setEditing(match)
            clearEditParam()
        } else {
            venuesApi.get(editId, controller.signal)
                .then((r) => {
                    if (controller.signal.aborted) return
                    setEditing(r.venue)
                    clearEditParam()
                })
                .catch(() => { if (!controller.signal.aborted) clearEditParam() }) // not on this page of the list
        }
        return () => controller.abort()
    }, [editId, data, setParams])

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

    const connectCalendar = async (venue) => {
        setCalendarBusy(venue.venueId)
        try {
            const result = await venuesApi.rotateCalendarToken(venue.venueId)
            setCalendar({ venue, url: result.calendarUrl })
        } catch (err) {
            toast.error(parseError(err).message)
        } finally {
            setCalendarBusy('')
        }
    }

    const copyCalendarUrl = async () => {
        try {
            await navigator.clipboard.writeText(calendar.url)
            toast.success('Calendar feed link copied.')
        } catch {
            toast.error('Copy the link from the field below.')
        }
    }

    return (
        <div className="container section">
            <PageHeader
                title="My venues"
                subtitle="Manage your listings, respond to booking requests and see upcoming bookings."
                actions={<button className="btn" onClick={() => setEditing('new')}>+ Add venue</button>}
            />
            {data?.data?.length > 0 && <PayoutsPanel venues={data.data} />}
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
                                    <button className="btn btn-ghost btn-sm" disabled={calendarBusy === v.venueId} onClick={() => connectCalendar(v)}>{calendarBusy === v.venueId ? 'Creating link…' : 'Calendar feed'}</button>
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
            {calendar && (
                <Modal open title={`Calendar feed · ${calendar.venue.name}`} onClose={() => setCalendar(null)}>
                    <Alert type="info">This private link shows the venue’s busy times for the next year. Creating a new link replaces the previous one.</Alert>
                    <Field label="Private calendar link"><input readOnly value={calendar.url} onFocus={(e) => e.target.select()} /></Field>
                    <div className="row-gap">
                        <button className="btn" onClick={copyCalendarUrl}>Copy link</button>
                        <a className="btn btn-ghost" href={calendar.url} target="_blank" rel="noreferrer">Open feed</a>
                    </div>
                </Modal>
            )}
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
