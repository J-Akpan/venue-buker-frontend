import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { venuesApi } from '../api'
import { useAsync, useDebounced, useTitle } from '../lib/hooks'
import VenueCard, { VenueCardSkeleton } from '../components/VenueCard'
import { EmptyState, ErrorState, Pagination } from '../components/ui'

const SORTS = [
    ['newest', 'Newest'],
    ['price_asc', 'Price: low to high'],
    ['price_desc', 'Price: high to low'],
    ['capacity_desc', 'Largest capacity'],
]
const FILTER_KEYS = ['q', 'location', 'minCapacity', 'maxPrice']

export default function Search() {
    useTitle('Find venues')
    const [params, setParams] = useSearchParams()
    // Text boxes keep local state and are pushed to the URL after a pause, so every search is shareable.
    const [draft, setDraft] = useState(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])))
    const debounced = useDebounced(draft)

    useEffect(() => {
        const next = new URLSearchParams(params)
        let changed = false
        for (const k of FILTER_KEYS) {
            const v = String(debounced[k]).trim()
            if ((next.get(k) || '') !== v) {
                changed = true
                v ? next.set(k, v) : next.delete(k)
            }
        }
        if (changed) {
            next.delete('page')
            setParams(next, { replace: true })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced])

    const sort = params.get('sort') || 'newest'
    const page = Number(params.get('page')) || 1
    const query = Object.fromEntries(
        [...FILTER_KEYS.map((k) => [k, params.get(k)]), ['sort', sort], ['page', page], ['limit', 12]].filter(([, v]) => v !== null && v !== ''),
    )
    const { data, error, loading, reload } = useAsync((signal) => venuesApi.list(query, signal), [params.toString()])

    const update = (k, v) => {
        const next = new URLSearchParams(params)
        v ? next.set(k, v) : next.delete(k)
        if (k !== 'page') next.delete('page')
        setParams(next)
        if (k === 'page') window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    const clear = () => {
        setDraft({ q: '', location: '', minCapacity: '', maxPrice: '' })
        setParams({})
    }
    const hasFilters = FILTER_KEYS.some((k) => params.get(k))
    const field = (k) => ({ value: draft[k], onChange: (e) => setDraft((d) => ({ ...d, [k]: e.target.value })) })

    return (
        <div className="container section">
            <h1>Find a venue</h1>
            <div className="filters card" role="search">
                <label>Keyword<input placeholder="e.g. garden, hall" maxLength={100} {...field('q')} /></label>
                <label>Location<input placeholder="City or area" maxLength={100} {...field('location')} /></label>
                <label>Min. guests<input type="number" min="1" inputMode="numeric" placeholder="Any" {...field('minCapacity')} /></label>
                <label>Max price / hour<input type="number" min="0" inputMode="numeric" placeholder="Any" {...field('maxPrice')} /></label>
                <label>Sort by
                    <select value={sort} onChange={(e) => update('sort', e.target.value === 'newest' ? '' : e.target.value)}>
                        {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </label>
            </div>

            <div className="results-bar" aria-live="polite">
                <span className="muted">{loading ? 'Searching…' : data ? `${data.meta.total} venue${data.meta.total === 1 ? '' : 's'} found` : ''}</span>
                {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button>}
            </div>

            {error ? (
                <ErrorState error={error} onRetry={reload} title="Search failed" />
            ) : loading && !data ? (
                <div className="venue-grid">{Array.from({ length: 6 }, (_, i) => <VenueCardSkeleton key={i} />)}</div>
            ) : data.data.length === 0 ? (
                <EmptyState title="No venues match your search" action={hasFilters && <button className="btn" onClick={clear}>Clear filters</button>}>
                    Try widening your budget or removing a filter.
                </EmptyState>
            ) : (
                <>
                    <div className={`venue-grid ${loading ? 'dim' : ''}`}>
                        {data.data.map((v) => <VenueCard key={v.venueId} venue={v} />)}
                    </div>
                    <Pagination meta={data.meta} onPage={(p) => update('page', String(p))} />
                </>
            )}
        </div>
    )
}
