import React, { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import * as api from '../api/mockApi'

export default function OwnerProfile() {
    const { user } = useAuth()
    const [venues, setVenues] = useState([])
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ name: '', city: '', address: '', capacity: '', price: '', image: '' })

    if (user && !user.profile) {
        return <Navigate to="/profile-update" replace />
    }

    useEffect(() => {
        if (!user) return
        const list = api.getVenuesByOwner(user.id)
        setVenues(list)
    }, [user])

    function refresh() {
        if (!user) return
        setVenues(api.getVenuesByOwner(user.id))
    }

    async function handleAdd(e) {
        e.preventDefault()
        const payload = { ...form, capacity: parseInt(form.capacity || '0', 10), price: parseInt(form.price || '0', 10) }
        const res = await api.addVenue(user.id, payload)
        if (res.ok) {
            setForm({ name: '', city: '', address: '', capacity: '', price: '', image: '' })
            refresh()
        }
    }

    function startEdit(v) {
        setEditing(v.id)
        setForm({ name: v.name || '', city: v.city || '', address: v.address || '', capacity: v.capacity || '', price: v.price || '', image: v.image || '' })
    }

    async function saveEdit(e) {
        e.preventDefault()
        const payload = { ...form, capacity: parseInt(form.capacity || '0', 10), price: parseInt(form.price || '0', 10) }
        const res = await api.updateVenue(editing, user.id, payload)
        if (res.ok) {
            setEditing(null)
            refresh()
        }
    }

    async function removeVenue(id) {
        if (!confirm('Delete this venue?')) return
        const res = await api.deleteVenue(id, user.id)
        if (res.ok) refresh()
    }

    return (
        <div className="container owner-profile-page">
            <h2>Venue Owner Dashboard</h2>
            <p className="muted">Logged in as: {user?.username} ({user?.role})</p>

            <section style={{ marginTop: 18 }}>
                <h3>Your venues</h3>
                <div className="owner-venues-grid">
                    {venues.length === 0 && <div className="card">No venues yet — create one below.</div>}
                    {venues.map(v => (
                        <div className="card" key={v.id}>
                            {v.image && <img src={v.image} alt={v.name} />}
                            <h4>{v.name}</h4>
                            <div className="muted">{v.city} • {v.address}</div>
                            <div className="muted">Capacity: {v.capacity} • NGN {v.price}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <Link to={`/venues/${v.id}`} className="btn">View</Link>
                                <button className="btn" onClick={() => startEdit(v)}>Edit</button>
                                <button className="btn" onClick={() => removeVenue(v.id)} style={{ background: 'linear-gradient(180deg, rgba(200,20,20,0.9), #c62828)', color: '#fff' }}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ marginTop: 24 }}>
                <h3>{editing ? 'Edit venue' : 'Add new venue'}</h3>
                <form onSubmit={editing ? saveEdit : handleAdd} className="owner-form">
                    <input placeholder="Venue name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
                    <input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                    <input placeholder="Capacity" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} type="number" />
                    <input placeholder="Price (NGN)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} type="number" />
                    <input placeholder="Image URL (optional)" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn" type="submit">{editing ? 'Save changes' : 'Create venue'}</button>
                        {editing && <button type="button" className="btn" onClick={() => { setEditing(null); setForm({ name: '', city: '', address: '', capacity: '', price: '', image: '' }) }}>Cancel</button>}
                    </div>
                </form>
            </section>
        </div>
    )
}
