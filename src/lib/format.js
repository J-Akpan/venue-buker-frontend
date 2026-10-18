export const money = (amount, currency = 'USD') => {
    try {
        return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
        }).format(Number(amount))
    } catch {
        return `${currency} ${Number(amount).toFixed(2)}`
    }
}

export const dateTime = (iso) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const durationLabel = (startIso, endIso) => {
    const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000)
    const d = Math.floor(mins / 1440)
    const h = Math.floor((mins % 1440) / 60)
    const m = mins % 60
    return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || '0m'
}

/** Value for <input type="datetime-local"> in local time. */
export const toLocalInput = (date) => {
    const p = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`
}

export const initials = (user) =>
    ((user?.firstname?.[0] || user?.username?.[0] || '?') + (user?.lastname?.[0] || '')).toUpperCase()

export const newKey = () =>
    (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '')
