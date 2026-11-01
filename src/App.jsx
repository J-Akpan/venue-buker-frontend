import React, { Suspense, lazy, useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import { RequireAuth, GuestOnly } from './components/guards'
import { Spinner } from './components/ui'
import { useAuth } from './auth/AuthProvider'

import Landing from './pages/Landing'
import Search from './pages/Search'
import VenueDetails from './pages/VenueDetails'
import Login from './pages/Login'
import Register from './pages/Register'

// Less-visited screens are split out of the first bundle.
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Profile = lazy(() => import('./pages/Profile'))
const Bookings = lazy(() => import('./pages/Bookings'))
const BookingDetail = lazy(() => import('./pages/BookingDetail'))
const PaymentResult = lazy(() => import('./pages/PaymentResult'))
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminVenues = lazy(() => import('./pages/AdminVenues'))
const Support = lazy(() => import('./pages/Support'))
const CaseDetail = lazy(() => import('./pages/CaseDetail'))
const AdminCases = lazy(() => import('./pages/AdminCases'))
const AdminStaff = lazy(() => import('./pages/AdminStaff'))
const AdminPrivacy = lazy(() => import('./pages/AdminPrivacy'))
const About = lazy(() => import('./pages/About'))

function ScrollToTop() {
    const { pathname } = useLocation()
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])
    return null
}

function NotFound() {
    return (
        <div className="container state-box" style={{ marginTop: 64 }}>
            <h1>404</h1>
            <p className="muted">We couldn't find that page.</p>
            <Link to="/" className="btn">Back to home</Link>
        </div>
    )
}

function SessionBanner() {
    const { expired, dismissExpired, sessionError, retrySession, status } = useAuth()
    if (sessionError) {
        return (
            <div className="banner" role="alert">
                We couldn't verify your saved session. Check your connection and try again.
                <button className="btn btn-ghost btn-sm" onClick={retrySession} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Retrying…' : 'Retry'}
                </button>
            </div>
        )
    }
    if (!expired) return null
    return (
        <div className="banner" role="alert">
            Your session expired. <Link to="/login" onClick={dismissExpired}>Sign in again</Link> to continue.
            <button className="icon-btn" aria-label="Dismiss" onClick={dismissExpired}>×</button>
        </div>
    )
}

export default function App() {
    return (
        <div className="app-shell">
            <a href="#main" className="skip-link">Skip to content</a>
            <ScrollToTop />
            <NavBar />
            <SessionBanner />
            <main id="main">
                <Suspense fallback={<Spinner />}>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/search" element={<Search />} />
                        <Route path="/venues/:venueId" element={<VenueDetails />} />
                        <Route path="/about" element={<About />} />

                        <Route element={<GuestOnly />}>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                        </Route>

                        <Route element={<RequireAuth />}>
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/bookings" element={<Bookings />} />
                            <Route path="/bookings/:bookingId" element={<BookingDetail />} />
                            <Route path="/support" element={<Support />} />
                            <Route path="/support/:caseId" element={<CaseDetail />} />
                            <Route path="/payment/success" element={<PaymentResult kind="success" />} />
                            <Route path="/payment/cancel" element={<PaymentResult kind="cancel" />} />
                        </Route>

                        <Route element={<RequireAuth role="Venue Owner" />}>
                            <Route path="/owner" element={<OwnerDashboard />} />
                        </Route>

                        <Route element={<RequireAuth role="Admin" />}>
                            <Route path="/admin" element={<AdminUsers />} />
                            <Route path="/admin/venues" element={<AdminVenues />} />
                            <Route path="/admin/cases" element={<AdminCases />} />
                            <Route path="/admin/cases/:caseId" element={<CaseDetail staff />} />
                            <Route path="/admin/privacy" element={<AdminPrivacy />} />
                        </Route>

                        <Route element={<RequireAuth role="Super Admin" />}>
                            <Route path="/admin/staff" element={<AdminStaff />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </main>
            <Footer />
        </div>
    )
}
