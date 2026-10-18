import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [items, setItems] = useState([])
    const id = useRef(0)

    const dismiss = useCallback((toastId) => setItems((l) => l.filter((t) => t.id !== toastId)), [])
    const push = useCallback(
        (type, message) => {
            const toastId = ++id.current
            setItems((l) => [...l.slice(-3), { id: toastId, type, message }])
            setTimeout(() => dismiss(toastId), type === 'error' ? 7000 : 4000)
        },
        [dismiss],
    )
    const api = useMemo(
        () => ({
            success: (m) => push('success', m),
            error: (m) => push('error', m),
            info: (m) => push('info', m),
        }),
        [push],
    )

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toasts" role="region" aria-label="Notifications">
                {items.map((t) => (
                    <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
                        <span>{t.message}</span>
                        <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)
