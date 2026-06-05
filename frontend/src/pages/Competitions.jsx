import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../components/AuthModal.css'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import './Competitions.css'
import './Home.css'

function SkeletonCard() {
  return (
    <div className="t-card comp-card skeleton-card">
      <div className="skel skel-sm" />
      <div className="skel skel-lg" />
      <div className="skel skel-md" />
      <div className="skel-btn-row">
        <div className="skel skel-btn" />
        <div className="skel skel-btn" />
      </div>
    </div>
  )
}

// ── Add to Folder modal ───────────────────────────────────────────────────────
function AddToFolderModal({ tournament, onClose }) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!user) { setError('Please log in to use folders'); setLoading(false); return }
      const data2 = await api.getFolders(user.id)
      setFolders(data2)
      setLoading(false)
    })
  }, [])

  async function addToFolder() {
    if (!selectedFolder) return
    setSaving(true)
    try {
      await api.addToFolder(selectedFolder, tournament.id, note)
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError('Failed to add — already in folder or other error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      className="auth-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="auth-modal"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <button className="auth-close" onClick={onClose}>×</button>
        <div className="auth-logo">📁 Add to Folder</div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
          {tournament.name}
        </p>

        {loading ? (
          <div className="spinner" />
        ) : error ? (
          <div className="auth-error">{error}</div>
        ) : success ? (
          <div className="auth-success">✓ Added to folder!</div>
        ) : folders.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            No folders yet. <Link to="/folders" style={{ color: '#4a8fc4' }}>Create one first →</Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFolder(f.id)}
                  style={{
                    padding: '10px 14px',
                    background: selectedFolder === f.id ? 'rgba(74,143,196,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedFolder === f.id ? 'rgba(74,143,196,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 8,
                    color: selectedFolder === f.id ? '#4a8fc4' : 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>📁 {f.name}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    {f.folder_items?.length || 0} items
                  </span>
                </button>
              ))}
            </div>

            <div className="auth-field" style={{ marginBottom: 16 }}>
              <label>Note (optional)</label>
              <input
                type="text"
                placeholder="e.g. Open Winners, Broke to semis..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <button
              className="auth-submit"
              onClick={addToFolder}
              disabled={!selectedFolder || saving}
            >
              {saving ? 'Adding...' : 'Add to Folder'}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Competitions() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [folderTarget, setFolderTarget] = useState(null)

  useEffect(() => {
    api.listTournaments({})
      .then(setTournaments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = tournaments
    .filter(t => !query || t.name?.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at))

  return (
    <div className="comp-page">
      <div className="comp-header">
        <div className="comp-header-inner">
          <Link to="/" className="comp-back">← Back</Link>
          <motion.h1 className="comp-title" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Competitions
          </motion.h1>
          <motion.p className="comp-subtitle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            Browse all archived debate tournaments
          </motion.p>
        </div>
      </div>

      <main className="comp-main">
        <motion.div className="comp-stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="comp-stat">
            <span className="comp-stat-num">{tournaments.length}</span>
            <span className="comp-stat-label">Tournaments</span>
          </div>
        </motion.div>

        <motion.div className="comp-filters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <input
              className="search-bar"
              placeholder="Search tournaments..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd"/>
            </svg>
          </div>
        </motion.div>

        {loading ? (
          <div className="comp-grid">
            {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">No tournaments found.</div>
        ) : (
          <motion.div className="comp-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <AnimatePresence>
              {filtered.map((t, i) => (
                <TournamentCard
                  key={t.id}
                  t={t}
                  index={i}
                  onAddToFolder={() => setFolderTarget(t)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {folderTarget && (
          <AddToFolderModal
            tournament={folderTarget}
            onClose={() => setFolderTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TournamentCard({ t, index, onAddToFolder }) {
  return (
    <motion.div
      className="t-card comp-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="t-card-top">
        {t.format && <span className="t-format-badge">{t.format}</span>}
        {t.date && <span className="t-date">{new Date(t.date).getFullYear()}</span>}
      </div>
      <h3 className="t-name">{t.name}</h3>
      {t.institution && <div className="t-institution">{t.institution}</div>}
      <div className="t-links">
        <Link to={`/archive/${t.slug}`} className="t-link-primary">
          🗄️ View Archive
        </Link>
        {t.original_url && (
          <a href={t.original_url} target="_blank" rel="noreferrer" className="t-link-secondary">
            🔗 Original Tab ↗
          </a>
        )}
        <button className="t-link-folder" onClick={onAddToFolder}>
          📁 Save to Folder
        </button>
      </div>
      <div className="t-archived">
        Archived {new Date(t.archived_at).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric'
        })}
      </div>
    </motion.div>
  )
}