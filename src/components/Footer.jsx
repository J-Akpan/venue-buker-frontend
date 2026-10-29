import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function Footer() {
    const { user, isOwner } = useAuth()
    return (
        <footer className="site-footer">
            <div className={`container footer-grid ${user && !isOwner ? 'two-cols' : ''}`}>
                <div>
                    <h4>VenBuk</h4>
                    <p className="muted-on-dark">Discover event venues and book them with instant, secure checkout.</p>
                </div>
                <div>
                    <h4>Explore</h4>
                    <ul className="footer-links">
                        <li><Link to="/search">Find venues</Link></li>
                        <li><Link to="/about">How it works</Link></li>
                        {user && <li><Link to="/bookings">My bookings</Link></li>}
                    </ul>
                </div>
                {(!user || isOwner) && (
                    <div>
                        <h4>For venue owners</h4>
                        <ul className="footer-links">
                            <li><Link to={isOwner ? '/owner' : '/register?role=owner'}>{isOwner ? 'My venues' : 'List your venue'}</Link></li>
                        </ul>
                    </div>
                )}
            </div>
            <div className="container footer-bottom">
                <span>© {new Date().getFullYear()} VenBuk. All rights reserved.</span>
                <span>Payments processed securely by Stripe.</span>
            </div>
        </footer>
    )
}
