import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { getVenueById } from '../api/mockApi'

export default function Payment() {
    const { user } = useAuth()
    const nav = useNavigate()
    const location = useLocation()
    const booking = location.state?.booking
    const venue = booking ? getVenueById(booking.venueId) : null

    const [form, setForm] = useState({
        cardName: '',
        cardNumber: '',
        expiryDate: '',
        cvv: ''
    })
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handlePayment = async (e) => {
        e.preventDefault()
        if (!form.cardName || !form.cardNumber || !form.expiryDate || !form.cvv) {
            return alert('Please fill in all payment details')
        }
        setLoading(true)
        // Simulate payment processing
        setTimeout(() => {
            alert('Payment successful! Your booking is confirmed.')
            nav('/profile')
        }, 1500)
    }

    if (!booking || !venue) {
        return (
            <div className="container main-section">
                <div className="card">
                    <h2>Payment Error</h2>
                    <p className="muted">No booking found. Please create a booking first.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container main-section payment-page">
            <h1 className="section-title">Confirm Payment</h1>

            <div className="payment-layout">
                {/* Booking summary */}
                <div className="card booking-summary">
                    <h3>Booking Summary</h3>
                    <div>
                        <div><strong>{venue.name}</strong></div>
                        <div className="muted">{venue.address}</div>
                    </div>
                    <div className="booking-summary-details">
                        <div>
                            <span>Venue</span>
                            <span>₦{venue.price.toLocaleString()}</span>
                        </div>
                        <div>
                            <span>Booking Date</span>
                            <span>{booking.date}</span>
                        </div>
                        <div>
                            <span>Purpose</span>
                            <span>{booking.purpose || 'N/A'}</span>
                        </div>
                        <hr />
                        <div className="total">
                            <span>Total</span>
                            <span>₦{venue.price.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Payment form */}
                <div className="card">
                    <h3>Payment Details</h3>
                    <form onSubmit={handlePayment} className="payment-form">
                        <label>Cardholder Name</label>
                        <input
                            name="cardName"
                            value={form.cardName}
                            onChange={handleChange}
                            placeholder="John Doe"
                            required
                        />

                        <label>Card Number</label>
                        <input
                            name="cardNumber"
                            value={form.cardNumber}
                            onChange={handleChange}
                            placeholder="1234 5678 9012 3456"
                            maxLength="16"
                            required
                        />

                        <div className="payment-form-row">
                            <div>
                                <label>Expiry Date</label>
                                <input
                                    name="expiryDate"
                                    value={form.expiryDate}
                                    onChange={handleChange}
                                    placeholder="MM/YY"
                                    maxLength="5"
                                    required
                                />
                            </div>
                            <div>
                                <label>CVV</label>
                                <input
                                    name="cvv"
                                    value={form.cvv}
                                    onChange={handleChange}
                                    placeholder="123"
                                    maxLength="3"
                                    required
                                />
                            </div>
                        </div>

                        <div className="payment-buttons">
                            <button className="btn" type="submit" disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
                                {loading ? 'Processing...' : 'Complete Payment'}
                            </button>
                            <button className="btn secondary" type="button" onClick={() => nav('/profile')}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
