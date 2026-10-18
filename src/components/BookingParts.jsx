import React from 'react'
import { useCountdown } from '../lib/hooks'

/** "Pay within 12:34" for an unpaid hold. Calls onExpire once when it reaches zero. */
export function HoldTimer({ expiresAt, onExpire }) {
    const secs = useCountdown(expiresAt)
    const fired = React.useRef(false)
    React.useEffect(() => {
        if (expiresAt && secs === 0 && !fired.current) {
            fired.current = true
            onExpire?.()
        }
    }, [secs, expiresAt, onExpire])
    if (!expiresAt) return null
    if (secs === 0) return <span className="muted small">Hold expired</span>
    const mm = String(Math.floor(secs / 60)).padStart(2, '0')
    const ss = String(secs % 60).padStart(2, '0')
    return <span className={`hold-timer ${secs < 120 ? 'urgent' : ''}`}>⏱ Pay within {mm}:{ss}</span>
}

/** Pending bookings past their hold are effectively expired even before the server sweeps them. */
export const effectiveStatus = (b) =>
    b.status === 'pending' && b.expiresAt && new Date(b.expiresAt) < new Date() ? 'expired' : b.status

export const canCancel = (b, status = effectiveStatus(b)) =>
    (status === 'pending' || status === 'confirmed') && new Date(b.startsAt) > new Date()
