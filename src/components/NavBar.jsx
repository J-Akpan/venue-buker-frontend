import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { initials } from '../lib/format'
import logo from '../assets/logo.svg'

export default function NavBar() {
    const { user, isOwner, isAdmin, isSuperAdmin, logout } = useAuth()
    const nav = useNavigate()
    const location = useLocation()
    const [open, setOpen] = useState(false)
    const [menu, setMenu] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        setOpen(false)
        setMenu(false)
    }, [location.pathname])

    useEffect(() => {
        if (!menu) return
        const close = (e) => {
            if (e.type === 'keydown' ? e.key === 'Escape' : !menuRef.current?.contains(e.target)) setMenu(false)
        }
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', close)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', close)
        }
    }, [menu])

    const signOut = async () => {
        await logout()
        nav('/')
    }

    return (
        <header className="site-header">
            <div className="container header-inner">
                <Link to="/" className="brand-link" aria-label="VenBuk home">
                    <img src={logo} alt="VenBuk" className="site-logo" />
                </Link>

                <button
                    className="hamburger-btn"
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                    aria-controls="primary-nav"
                    onClick={() => setOpen((o) => !o)}
                >
                    <span className={`bar ${open ? 'open' : ''}`} />
                    <span className={`bar ${open ? 'open' : ''}`} />
                    <span className={`bar ${open ? 'open' : ''}`} />
                </button>

                <nav id="primary-nav" className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
                    <NavLink to="/search" className="nav-link">Find venues</NavLink>
                    {user && <NavLink to="/bookings" className="nav-link">My bookings</NavLink>}
                    {isOwner && <NavLink to="/owner" className="nav-link">My venues</NavLink>}
                    {user && <NavLink to="/support" className="nav-link">Support</NavLink>}
                    {isAdmin && <NavLink to="/admin" end className="nav-link">Users</NavLink>}
                    {isAdmin && <NavLink to="/admin/cases" className="nav-link">Cases</NavLink>}
                    {isSuperAdmin && <NavLink to="/admin/staff" className="nav-link">Staff</NavLink>}

                    <span className="nav-spacer" />

                    {user ? (
                        <div className="user-menu" ref={menuRef}>
                            <button
                                className="avatar-btn"
                                aria-haspopup="menu"
                                aria-expanded={menu}
                                onClick={() => setMenu((m) => !m)}
                            >
                                <span className="avatar" aria-hidden>{initials(user)}</span>
                                <span className="avatar-name">{user.username}</span>
                                <span aria-hidden>▾</span>
                            </button>
                            {menu && (
                                <div className="dropdown" role="menu">
                                    <div className="dropdown-head">
                                        <strong>{user.firstname ? `${user.firstname} ${user.lastname || ''}` : user.username}</strong>
                                        <span className="muted small">{user.role}</span>
                                    </div>
                                    <Link role="menuitem" to="/profile">Profile &amp; security</Link>
                                    <Link role="menuitem" to="/bookings">My bookings</Link>
                                    <button role="menuitem" onClick={signOut}>Sign out</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <NavLink to="/login" className="nav-link">Sign in</NavLink>
                            <Link to="/register" className="btn btn-gold">Get started</Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}
