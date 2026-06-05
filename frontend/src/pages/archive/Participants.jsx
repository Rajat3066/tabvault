import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TabbycatNav from '../../components/TabbycatNav'
import { api } from '../../lib/api'

export default function Participants() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getParticipants(slug)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const q = query.toLowerCase()

  const filteredAdjs = (data?.adjudicators || []).filter(a =>
    !q || a.name?.toLowerCase().includes(q) || a.institution?.toLowerCase().includes(q)
  )

  const filteredSpeakers = (data?.speakers || [])
  .filter(s => !s.categories?.includes('reply'))
  .filter(s => !q || s.name?.toLowerCase().includes(q) || s.team_name?.toLowerCase().includes(q))
  .filter(s => s.name && s.name.toLowerCase() !== 'redacted')
  .sort((a, b) => (a.team_name || '').localeCompare(b.team_name || ''))

  return (
    <div className="page">
      <TabbycatNav />
      <div className="container">
        <h1 className="page-title">
          <span className="emoji">🚌</span>
          Participants
        </h1>

        {/* Search */}
        <div className="search-wrap">
          <input
            className="search-bar"
            placeholder="Find in Table"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd"/>
          </svg>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Adjudicators */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Adjudicators</h2>
              </div>
              <table className="tab-table">
                <thead>
                  <tr>
                    <th><span>👤</span></th>
                    <th><span>🏛️</span></th>
                    <th><span>👥</span></th>
                    <th><span>➕</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdjs.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No adjudicators found.</td></tr>
                  ) : filteredAdjs.map((a, i) => (
                    <tr key={a.id || i}>
                      <td><span className="name-cell">{a.name}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{a.institution || '—'}</td>
                      <td></td>
                      <td>{a.is_breaking ? '✓' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Speakers */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Speakers</h2>
              </div>
              <table className="tab-table">
                <thead>
                  <tr>
                    <th><span>👤</span></th>
                    <th><span>👥</span></th>
                    <th><span>🏆</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpeakers.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No speakers found.</td></tr>
                  ) : filteredSpeakers.map((s, i) => (
                    <tr key={s.id || i}>
                      <td><span className="name-cell">{s.name}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {([...new Set(s.categories || [])]).filter(c => c !== 'reply').join(', ') || '—'}
                        </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.team_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile: stack vertically */}
        <style>{`
          @media (max-width: 640px) {
            .participants-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
