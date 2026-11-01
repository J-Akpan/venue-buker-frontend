import React, { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icons'

export function Spinner({ label = 'Loading…', inline = false }) {
    return (
        <div className={inline ? 'spinner-inline' : 'spinner-wrap'} role="status" aria-live="polite">
            <span className="spinner" aria-hidden />
            <span className={inline ? 'sr-only' : 'muted'}>{label}</span>
        </div>
    )
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
    return (
        <div className="state-box" role="alert">
            <div className="state-icon" aria-hidden><Icon name="alert" size={26} /></div>
            <h3>{title}</h3>
            <p className="muted">{error?.message || 'Please try again.'}</p>
            {error?.requestId && <p className="muted small">Reference: {error.requestId}</p>}
            {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
        </div>
    )
}

export function EmptyState({ title, children, action }) {
    return (
        <div className="state-box">
            <div className="state-icon soft" aria-hidden><Icon name="inbox" size={26} /></div>
            <h3>{title}</h3>
            {children && <p className="muted">{children}</p>}
            {action}
        </div>
    )
}

export function Alert({ type = 'error', children }) {
    if (!children) return null
    return (
        <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
            {children}
        </div>
    )
}

export function PageHeader({ title, subtitle, actions }) {
    return (
        <div className="page-header">
            <div>
                <h1>{title}</h1>
                {subtitle && <p className="muted">{subtitle}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
        </div>
    )
}

export function Field({ label, error, hint, children }) {
    const id = useId()
    const child = React.cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined,
    })
    return (
        <div className={`field ${error ? 'has-error' : ''}`}>
            <label htmlFor={id}>{label}</label>
            {child}
            {hint && !error && <small id={`${id}-hint`} className="muted">{hint}</small>}
            {error && <small id={`${id}-err`} className="field-error">{error}</small>}
        </div>
    )
}

const STATUS_STYLE = {
    pending: 'warn',
    confirmed: 'ok',
    cancelled: 'neutral',
    expired: 'neutral',
    Pending: 'warn',
    Completed: 'ok',
    Failed: 'bad',
    Refunded: 'info',
    open: 'warn',
    in_review: 'info',
    resolved: 'ok',
    rejected: 'bad',
}
export function StatusBadge({ status }) {
    return <span className={`badge badge-${STATUS_STYLE[status] || 'neutral'}`}>{String(status).replace('_', ' ')}</span>
}

export function Pagination({ meta, onPage }) {
    if (!meta || meta.totalPages <= 1) return null
    return (
        <nav className="pagination" aria-label="Pagination">
            <button className="btn btn-ghost" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>← Previous</button>
            <span className="muted">Page {meta.page} of {meta.totalPages}</span>
            <button className="btn btn-ghost" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next →</button>
        </nav>
    )
}

/** Accessible modal: focus is moved in, trapped with Tab, Esc closes, focus returns on close. */
export function Modal({ open, title, onClose, children, footer }) {
    const ref = useRef(null)
    const titleId = useId()
    useEffect(() => {
        if (!open) return
        const prev = document.activeElement
        const node = ref.current
        const focusables = () => node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        focusables()[0]?.focus()
        const onKey = (e) => {
            if (e.key === 'Escape') return onClose()
            if (e.key !== 'Tab') return
            const f = [...focusables()].filter((el) => !el.disabled)
            if (!f.length) return
            const first = f[0], last = f[f.length - 1]
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        }
        document.addEventListener('keydown', onKey)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = ''
            prev?.focus?.()
        }
    }, [open, onClose])
    if (!open) return null
    return (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
                <div className="modal-head">
                    <h2 id={titleId}>{title}</h2>
                    <button className="icon-btn" aria-label="Close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose }) {
    return (
        <Modal
            open={open}
            title={title}
            onClose={busy ? () => {} : onClose}
            footer={
                <>
                    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Keep it</button>
                    <button className={`btn ${danger ? 'btn-danger' : ''}`} onClick={onConfirm} disabled={busy}>
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </>
            }
        >
            <p>{message}</p>
        </Modal>
    )
}

export const BackLink = ({ to, children }) => (
    <Link to={to} className="back-link">← {children}</Link>
)
