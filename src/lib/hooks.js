import { useCallback, useEffect, useState } from 'react'
import { parseError } from '../api/client'

/** Runs an async loader whenever `deps` change; stale responses are aborted/ignored. */
export function useAsync(loader, deps) {
    const [state, setState] = useState({ data: null, error: null, loading: true })
    const [tick, setTick] = useState(0)
    useEffect(() => {
        const ctrl = new AbortController()
        setState((s) => ({ ...s, loading: true, error: null }))
        loader(ctrl.signal)
            .then((data) => !ctrl.signal.aborted && setState({ data, error: null, loading: false }))
            .catch((err) => {
                if (ctrl.signal.aborted || err?.code === 'ERR_CANCELED') return
                setState({ data: null, error: parseError(err), loading: false })
            })
        return () => ctrl.abort()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, tick])
    const reload = useCallback(() => setTick((t) => t + 1), [])
    return { ...state, reload }
}

export function useDebounced(value, ms = 350) {
    const [v, setV] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms)
        return () => clearTimeout(t)
    }, [value, ms])
    return v
}

export function useTitle(title) {
    useEffect(() => {
        document.title = title ? `${title} · VenBuk` : 'VenBuk – Book event venues with ease'
    }, [title])
}

/** Whole seconds remaining until `iso`, ticking every second (0 when past or unset). */
export function useCountdown(iso) {
    const calc = () => (iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : 0)
    const [secs, setSecs] = useState(calc)
    useEffect(() => {
        setSecs(calc())
        if (!iso) return
        const t = setInterval(() => setSecs(calc()), 1000)
        return () => clearInterval(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iso])
    return secs
}
