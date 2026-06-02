/**
 * RetailersProvider fetches the curated Shopping List catalog once at app
 * startup and exposes it via `useRetailers()`. If Sanity is unreachable we
 * fall back to the bundled FREE_TIER_RETAILERS in src/data/retailers.ts so
 * the retailer logo strip never renders blank.
 *
 * Mirrors ProjectsContext exactly (see src/ProjectsContext.tsx).
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { FREE_TIER_RETAILERS } from './data/retailers'
import { fetchRetailers, getCachedRetailers, type Retailer } from './lib/sanity'

/**
 * The bundled fallback only carries { name, domain }. Widen each entry to the
 * full Retailer shape so consumers see a consistent type whether the data
 * came from Sanity or the fallback.
 */
const FALLBACK_RETAILERS: Retailer[] = FREE_TIER_RETAILERS.map((r, i) => ({
  name: r.name,
  domain: r.domain,
  categories: [],
  budget: '',
  tier: 'free',
  regions: ['US'],
  order: i * 100,
}))

interface RetailersContextValue {
  retailers: Retailer[]
  loading: boolean
  error: Error | null
  /** True if the current `retailers` came from Sanity (false = bundled fallback). */
  fromSanity: boolean
}

const RetailersContext = createContext<RetailersContextValue | undefined>(undefined)

export const RetailersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Start with whatever is cached, else the bundled fallback. First paint
  // always has content — no loading skeleton on subsequent navigations.
  const initialCache = getCachedRetailers()
  const [retailers, setRetailers] = useState<Retailer[]>(initialCache ?? FALLBACK_RETAILERS)
  const [loading, setLoading] = useState<boolean>(!initialCache)
  const [error, setError] = useState<Error | null>(null)
  const [fromSanity, setFromSanity] = useState<boolean>(!!initialCache)

  useEffect(() => {
    if (initialCache) return // already have Sanity data cached

    let cancelled = false
    fetchRetailers()
      .then((data) => {
        if (cancelled) return
        setRetailers(data)
        setFromSanity(true)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        console.warn('[Sanity] retailer fetch failed, using bundled fallback:', e)
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
        // Keep showing FALLBACK_RETAILERS — don't blank the strip.
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <RetailersContext.Provider value={{ retailers, loading, error, fromSanity }}>
      {children}
    </RetailersContext.Provider>
  )
}

export function useRetailers(): RetailersContextValue {
  const ctx = useContext(RetailersContext)
  if (!ctx) {
    throw new Error('useRetailers must be used inside <RetailersProvider>')
  }
  return ctx
}
