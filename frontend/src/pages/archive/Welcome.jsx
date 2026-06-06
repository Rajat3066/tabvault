import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import TabbycatNav from '../../components/TabbycatNav'
import { api } from '../../lib/api'

export default function Welcome() {
  const { slug } = useParams()
  const [t, setT] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTournament(slug)
      .then(setT)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="page">
      <TabbycatNav />
      <div className="container">
        {loading ? (
          <div className="spinner" />
        ) : !t ? (
          <div className="empty">Tournament not found.</div>
        ) : (
          <>
            <h1 className="page-title">
              <span className="emoji">👋</span>
              Welcome to {t.name}
            </h1>

            {/* TabVault notice */}
            <div className="card" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12, background: 'var(--accent-light)', borderColor: 'var(--accent)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🗄️</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>TabVault Archive</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', wordBreak: 'break-all', whiteSpace: 'normal' }}>
                  This is a permanent archive of this tournament.
                  {t.original_url && (
                    <> Original tab: <a href={t.original_url} target="_blank" rel="noreferrer">{t.original_url}</a></>
                  )}
                </div>
              </div>
            </div>

            {/* Welcome text / poster */}
            {t.welcome_text && (
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                  {t.welcome_text}
                </pre>
              </div>
            )}

            {/* Meta */}
            <div className="card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {t.format && <Meta label="Format" value={t.format} />}
              {t.institution && <Meta label="Institution" value={t.institution} />}
              {t.date && <Meta label="Date" value={new Date(t.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} />}
              <Meta label="Archived" value={new Date(t.archived_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Meta({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
