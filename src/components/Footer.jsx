import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import logoLight from '../assets/logo-light.svg'
import Icon from './Icons'

function FooterLink({ to, children }) {
    return <Link to={to}>{children}</Link>
}

export default function Footer() {
    const { user } = useAuth()
    const isVenueOwner = user?.role === 'Venue Owner'
    const year = new Date().getFullYear()

    return (
        <footer className="site-footer">
            <div className="container footer-main">
                <div className="footer-brand-block">
                    <Link to="/" className="footer-brand" aria-label="VenBuk home">
                        <img className="footer-logo" src={logoLight} alt="" aria-hidden="true" />
                    </Link>
                    <p>Find a space that fits your event, send a booking request, and pay securely online after the venue accepts.</p>
                    <div className="footer-security">
                        <span className="footer-security-icon"><Icon name="shield" size={17} /></span>
                        <span><strong>Secure checkout</strong><small>Payments are handled by Stripe.</small></span>
                    </div>
                </div>

                <nav className="footer-column" aria-label="Explore VenBuk">
                    <h2>Explore</h2>
                    <FooterLink to="/search">Find a venue</FooterLink>
                    <FooterLink to="/about">How it works</FooterLink>
                    {user && <FooterLink to="/bookings">My bookings</FooterLink>}
                </nav>

                <nav className="footer-column" aria-label="Your account">
                    <h2>Your account</h2>
                    {user ? (
                        <>
                            <FooterLink to="/profile">Profile &amp; security</FooterLink>
                            <FooterLink to="/support">Support</FooterLink>
                        </>
                    ) : (
                        <>
                            <FooterLink to="/login">Sign in</FooterLink>
                            <FooterLink to="/register">Create an account</FooterLink>
                        </>
                    )}
                </nav>

                <nav className="footer-column" aria-label="Venue owners">
                    <h2>{isVenueOwner ? 'For venue owners' : user ? 'Plan another event' : 'For venue owners'}</h2>
                    {isVenueOwner ? (
                        <>
                            <FooterLink to="/owner">Manage your venues</FooterLink>
                            <FooterLink to="/bookings">View bookings</FooterLink>
                            <span className="footer-column-note">Manage listings and keep booking details in one place.</span>
                        </>
                    ) : user ? (
                        <>
                            <FooterLink to="/search">Browse venues</FooterLink>
                            <FooterLink to="/support">Get support</FooterLink>
                        </>
                    ) : (
                        <>
                            <FooterLink to="/register?role=owner">List your venue</FooterLink>
                            <span className="footer-column-note">Manage listings and keep booking details in one place.</span>
                        </>
                    )}
                </nav>
            </div>

            <div className="footer-bottom">
                <div className="container footer-bottom-inner">
                    <span>© {year} VenBuk. All rights reserved.</span>
                    <span>Made for better event planning.</span>
                </div>
            </div>
        </footer>
    )
}
