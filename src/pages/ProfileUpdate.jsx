import React, { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useNavigate } from 'react-router-dom'

export default function ProfileUpdate() {
    const { user, updateProfile } = useAuth()
    const [profile, setProfile] = useState(user?.profile || { fullName: '', phone: '', address: '' })
    const [msg, setMsg] = useState(null)
    const nav = useNavigate()

    async function submit(e) {
        e.preventDefault()
        const res = await updateProfile(profile)
        if (res.ok) {
            setMsg('Profile saved')
            setTimeout(() => nav('/search'), 800)
        } else setMsg(res.error)
    }

    return (
        <div className="container profile-update-page">
            <div className="card auth-card">
                <h2>Complete your profile</h2>
                <form onSubmit={submit}>
                    <input placeholder="Full name" value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })} required />
                    <input placeholder="Phone" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} required />
                    <input placeholder="Address" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} required />
                    {msg && <div className="muted">{msg}</div>}
                    <div>
                        <button className="btn" type="submit">Save profile</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
