import React, { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function AdminDashboard() {
    const { user } = useAuth()
    const times = [
        '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
    ]
    const [selected, setSelected] = useState(times[0])

    return (
        <div className="admin-dashboard container">
            <div className="card admin-layout">
                <aside className="admin-sidebar">
                    <h3>Available Times</h3>
                    <ul>
                        {times.map(t => (
                            <li key={t} className={`time-item ${t === selected ? 'active' : ''}`} onClick={() => setSelected(t)}>
                                {t}
                            </li>
                        ))}
                    </ul>
                </aside>

                <section className="admin-content">
                    <div className="card">
                        <h2>Time: {selected}</h2>
                        <p className="muted">Logged in as: {user?.username} ({user?.role})</p>
                        <p>Use this area to manage bookings, view slot assignments, or adjust availability for the selected time.</p>
                        <div style={{ marginTop: 12 }}>
                            <button className="btn secondary">Edit Slot</button>
                            <button className="btn" style={{ marginLeft: 8 }}>View Bookings</button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
