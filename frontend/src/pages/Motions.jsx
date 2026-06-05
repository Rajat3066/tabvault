import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import './Motions.css'

const MOTION_TYPES = ['All', 'THBT', 'THW', 'THP', 'THS', 'THR', 'THO', 'THA', 'TH']

function SkeletonMotion() {
  return (
    <div className="motion-card skeleton-card">
      <div className="skel skel-lg" style={{ marginBottom: 12 }} />
      <div className="skel skel-md" style={{ marginBottom: 8 }} />
      <div className="skel skel-sm" />
    </div>
  )
}

export default function MotionsRepo() {
  const [motions, setMotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [openInfo, setOpenInfo] = useState({})
  const [count, setCount] = useState(0)

  useEffect(() => {
    api.getMotionsCount().then(d => setCount(d.count)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (type !== 'All') params.type = type
    if (query) params.query = query
    api.getMotions(params)
      .then(setMotions)
      .catch(() => setMotions([]))
      .finally(() => setLoading(false))
  }, [type, query])

  function toggleInfo(id) {
    setOpenInfo(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="motions-page">
      <div className="motions-header">
        <div className="motions-header-inner">
          <Link to="/" className="comp-back">← Back</Link>
          <motion.h1
            className="comp-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Motion Repository
          </motion.h1>
          <motion.p
            className="comp-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {count} motions from archived tournaments
          </motion.p>
        </div>
      </div>

      <main className="motions-main">
        {/* Search */}
        <motion.div
          className="motions-search-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="search-wrap" style={{ flex: 1 }}>
            <input
              className="search-bar"
              placeholder="Search motions..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd"/>
            </svg>
          </div>
        </motion.div>

        {/* Motion type filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ marginBottom: 28 }}
        >
          <div className="motions-filter-label">Motion Type</div>
          <div className="motions-type-filters">
            {MOTION_TYPES.map(t => (
              <button
                key={t}
                className={`motion-type-pill${type === t ? ' active' : ''}`}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results count */}
        {!loading && (
          <div className="motions-result-count">
            {motions.length} motion{motions.length !== 1 ? 's' : ''} found
            {type !== 'All' && ` · ${type}`}
            {query && ` · "${query}"`}
          </div>
        )}

        {/* Motions list */}
        {loading ? (
          <div className="motions-list">
            {Array.from({ length: 8 }, (_, i) => <SkeletonMotion key={i} />)}
          </div>
        ) : motions.length === 0 ? (
          <div className="empty">No motions found.</div>
        ) : (
          <motion.div
            className="motions-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence>
              {motions.map((m, i) => (
                <MotionCard
                  key={m.id}
                  motion={m}
                  index={i}
                  isOpen={!!openInfo[m.id]}
                  onToggleInfo={() => toggleInfo(m.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  )
}

function MotionCard({ motion: m, index, isOpen, onToggleInfo }) {
  return (
    <motion.div
      className="motion-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <div className="motion-card-top">
        <div className="motion-tags">
          {m.motion_type && (
            <span className="motion-type-badge">{m.motion_type}</span>
          )}
        </div>
        {m.tournament && (
          <Link
            to={`/archive/${m.tournament.slug}`}
            className="motion-tournament-link"
          >
            {m.tournament.name} →
          </Link>
        )}
      </div>

      <p className="motion-text">{m.motion_text}</p>

      {m.info_slide && (
        <div className="motion-info-wrap">
          <button
            className="motion-info-btn"
            onClick={onToggleInfo}
          >
            {isOpen ? 'Hide info slide ▲' : 'View info slide ▼'}
          </button>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="motion-info-slide"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {m.info_slide}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}