import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import './TabbycatNav.css'

export default function TabbycatNav() {
  const { slug } = useParams()
  const location = useLocation()
  const [tournament, setTournament] = useState(null)
  const [rounds, setRounds] = useState([])
  const [breaks, setBreaks] = useState([])
  const [resultsOpen, setResultsOpen] = useState(false)
  const [breakOpen, setBreakOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const resultsRef = useRef(null)
  const breakRef = useRef(null)

  useEffect(() => {
  if (!slug) return
  api.getTournament(slug).then(t => {
    setTournament(t)
    console.log('public_pages:', t?.public_pages)
  }).catch(() => {})
  api.getRounds(slug).then(r => {
    setRounds(r)
    console.log('rounds:', r?.length)
  }).catch(() => {})
  api.getBreaks(slug).then(b => {
    setBreaks(b)
    console.log('breaks:', b?.length)
  }).catch(() => {})
}, [slug])

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (resultsRef.current && !resultsRef.current.contains(e.target)) setResultsOpen(false)
      if (breakRef.current && !breakRef.current.contains(e.target)) setBreakOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const pages = tournament?.public_pages || {}
  const path = (p) => `/archive/${slug}${p}`
  const active = (p) => location.pathname === path(p) || location.pathname.startsWith(path(p) + '/')

  const navLinks = [
    pages.teams && { label: 'Team Tab', to: path('/tab/team') },
    pages.noviceTeams && { label: 'Novice Teams', to: path('/tab/team/novice') },
    pages.speakers && { label: 'Speaker Tab', to: path('/tab/speaker') },
    // pages.speakers && { label: 'Open Speakers', to: path('/tab/speaker/open') },
    pages.noviceSpeakers && { label: 'Novice Speakers', to: path('/tab/speaker/novice') },
    pages.replies && { label: 'Replies Tab', to: path('/tab/replies') },
    pages.motions && { label: 'Motions Tab', to: path('/motions') },
  ].filter(Boolean)

  return (
    <nav className="tc-nav">
      <div className="tc-nav-inner">
        {/* Brand */}
        <div className="tc-brand">
          <div className="tc-logo">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <Link to={path('')} className="tc-brand-name">
            {tournament?.name || slug}
          </Link>
        </div>

        {/* Desktop links */}
        <div className="tc-links">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className={`tc-link${active(l.to.replace(`/archive/${slug}`, '')) ? ' active' : ''}`}>
              {l.label}
            </Link>
          ))}

          {/* Results dropdown */}
          {pages.results && rounds.length > 0 && (
            <div className="tc-dropdown" ref={resultsRef}>
              <button
                className={`tc-link tc-dropdown-trigger${location.pathname.includes('/results/') ? ' active' : ''}`}
                onClick={(e) => { 
                  e.stopPropagation()
                  setResultsOpen(o => !o); 
                  setBreakOpen(false) 
                }}
              >
                Results
                <svg viewBox="0 0 20 20" fill="currentColor" className="chevron">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"/>
                </svg>
              </button>
              {resultsOpen && (
                 <div className="tc-dropdown-menu">
                  {rounds.map(r => (
                    <Link
                      key={r.id}
                      to={path(`/results/round/${r.seq}`)}
                      className="tc-dropdown-item"
                      onClick={() => setResultsOpen(false)}
                    >
                      {r.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Break dropdown */}
          {pages.breaks && breaks.length > 0 && (
            <div className="tc-dropdown" ref={breakRef}>
              <button
                className={`tc-link tc-dropdown-trigger${location.pathname.includes('/break/') ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setBreakOpen(o => !o); setResultsOpen(false) }}
              >
                Break
                <svg viewBox="0 0 20 20" fill="currentColor" className="chevron">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"/>
                </svg>
              </button>
              {breakOpen && (
                <div className="tc-dropdown-menu">
                  {breaks.map(b => (
                    <Link
                      key={b.id}
                      to={path(`/break/${b.slug}`)}
                      className="tc-dropdown-item"
                      onClick={() => setBreakOpen(false)}
                    >
                      {b.name}
                    </Link>
                  ))}
                  {pages.breakAdjs && (
                    <Link
                      to={path('/break/adjudicators')}
                      className="tc-dropdown-item"
                      onClick={() => setBreakOpen(false)}
                    >
                      Adjudicators
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {pages.participants && (
            <Link to={path('/participants')} className={`tc-link${active('/participants') ? ' active' : ''}`}>
              Participants
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="tc-hamburger" onClick={() => setMobileOpen(o => !o)}>
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="tc-mobile-menu">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className="tc-mobile-link" onClick={() => setMobileOpen(false)}>
              {l.label}
            </Link>
          ))}
          {pages.results && rounds.map(r => (
            <Link key={r.id} to={path(`/results/round/${r.seq}`)} className="tc-mobile-link" onClick={() => setMobileOpen(false)}>
              {r.name}
            </Link>
          ))}
          {pages.breaks && breaks.map(b => (
            <Link key={b.id} to={path(`/break/${b.slug}`)} className="tc-mobile-link" onClick={() => setMobileOpen(false)}>
              {b.name} Break
            </Link>
          ))}
          {pages.participants && (
            <Link to={path('/participants')} className="tc-mobile-link" onClick={() => setMobileOpen(false)}>
              Participants
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
