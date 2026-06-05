import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TabbycatNav from '../../components/TabbycatNav'
import TabTable from '../../components/TabTable'
import { api } from '../../lib/api'

export default function Results() {
  const { slug, seq } = useParams()
  const [pairings, setPairings] = useState([])
  const [round, setRound] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('team') // 'team' | 'debate'

  useEffect(() => {
    Promise.all([
      api.getRoundResults(slug, seq),
      api.getRounds(slug),
    ]).then(([pairs, rounds]) => {
      setPairings(pairs)
      setRound(rounds.find(r => r.seq === parseInt(seq)))
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, seq])

  // View by Team: each pairing becomes 2 rows (gov row + opp row)
  const teamRows = pairings.flatMap(p => [
    {
      id: `${p.id}-gov`,
      team: p.gov_team?.name || '—',
      opponent: p.opp_team?.name || '—',
      side: 'Government',
      result: p.winner === 'gov' ? 'win' : p.winner === 'opp' ? 'loss' : null,
      adjudicators: p.adjudicators,
    },
    {
      id: `${p.id}-opp`,
      team: p.opp_team?.name || '—',
      opponent: p.gov_team?.name || '—',
      side: 'Opposition',
      result: p.winner === 'opp' ? 'win' : p.winner === 'gov' ? 'loss' : null,
      adjudicators: p.adjudicators,
    },
  ])

  // View by Debate: one row per debate
  const debateRows = pairings.map(p => ({
    id: p.id,
    gov: p.gov_team?.name || '—',
    opp: p.opp_team?.name || '—',
    winner: p.winner === 'gov' ? (p.gov_team?.name || 'Gov') : p.winner === 'opp' ? (p.opp_team?.name || 'Opp') : '—',
    adjudicators: p.adjudicators,
  }))

  const teamColumns = [
    {
      key: 'team',
      label: 'Team',
      icon: <span>👥</span>,
      render: (v) => <span className="name-cell">{v}</span>
    },
    {
      key: 'opponent',
      label: 'vs',
      render: (v, row) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {row.result === 'win'
            ? <span className="win-arrow">▲ </span>
            : row.result === 'loss'
              ? <span className="loss-arrow">▼ </span>
              : null}
          vs {v}
        </span>
      )
    },
    {
      key: 'side',
      label: 'Side',
      render: (v) => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
    },
    {
      key: 'adjudicators',
      label: 'Adjudicators',
      sortable: false,
      render: (v) => <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{(v || []).join(', ') || '—'}</span>
    },
  ]

  const debateColumns = [
    {
      key: 'gov',
      label: 'Government',
      render: (v) => <span className="name-cell">{v}</span>
    },
    {
      key: 'opp',
      label: 'Opposition',
      render: (v) => <span className="name-cell">{v}</span>
    },
    {
      key: 'winner',
      label: 'Winner',
      render: (v) => <span style={{ fontWeight: 600, color: 'var(--win)' }}>{v}</span>
    },
    {
      key: 'adjudicators',
      label: 'Adjudicators',
      sortable: false,
      render: (v) => <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{(v || []).join(', ') || '—'}</span>
    },
  ]

  return (
    <div className="page">
      <TabbycatNav />
      <div className="container">
        <h1 className="page-title">
          <span className="emoji">💥</span>
          Results
          {round && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 22 }}> for {round.name}</span>}
        </h1>

        {round?.motion && (
          <div className="card" style={{ padding: '14px 20px', marginBottom: 16, borderLeft: '4px solid var(--accent)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Motion</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{round.motion}</div>
          </div>
        )}

        <div className="toggle-group" style={{ marginBottom: 16 }}>
          <button className={`toggle-btn${view === 'team' ? ' active' : ''}`} onClick={() => setView('team')}>View by Team</button>
          <button className={`toggle-btn${view === 'debate' ? ' active' : ''}`} onClick={() => setView('debate')}>View by Debate</button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : view === 'team' ? (
          <TabTable columns={teamColumns} rows={teamRows} searchKeys={['team', 'opponent']} emptyText="No results available." />
        ) : (
          <TabTable columns={debateColumns} rows={debateRows} searchKeys={['gov', 'opp']} emptyText="No results available." />
        )}
      </div>
    </div>
  )
}
