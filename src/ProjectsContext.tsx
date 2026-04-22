/**
 * ProjectsProvider fetches the portfolio once at app startup and exposes it
 * to any component via `useProjects()`. If Sanity is unreachable, we fall
 * back to the bundled `PROJECTS_LIST` in constants.tsx so the site never
 * renders an empty portfolio.
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { PROJECTS_LIST, type ProjectData } from './constants'
import { fetchProjects, getCachedProjects } from './lib/sanity'

interface ProjectsContextValue {
  projects: ProjectData[]
  loading: boolean
  error: Error | null
  /** True if the current `projects` came from Sanity (false = bundled fallback). */
  fromSanity: boolean
}

const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined)

export const ProjectsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Start with whatever is cached, else the bundled fallback. This means the
  // first paint always has content — no loading skeleton on subsequent navigations.
  const initialCache = getCachedProjects()
  const [projects, setProjects] = useState<ProjectData[]>(initialCache ?? PROJECTS_LIST)
  const [loading, setLoading] = useState<boolean>(!initialCache)
  const [error, setError] = useState<Error | null>(null)
  const [fromSanity, setFromSanity] = useState<boolean>(!!initialCache)

  useEffect(() => {
    if (initialCache) return // already have Sanity data cached

    let cancelled = false
    fetchProjects()
      .then((data) => {
        if (cancelled) return
        setProjects(data)
        setFromSanity(true)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        console.warn('[Sanity] fetch failed, using bundled fallback:', e)
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
        // Keep showing the bundled PROJECTS_LIST — don't blank the site.
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ProjectsContext.Provider value={{ projects, loading, error, fromSanity }}>
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext)
  if (!ctx) {
    throw new Error('useProjects must be used inside <ProjectsProvider>')
  }
  return ctx
}
