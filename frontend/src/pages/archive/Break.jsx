import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TabbycatNav from '../../components/TabbycatNav'
import TabTable from '../../components/TabTable'
import { api } from '../../lib/api'

export default function Break() {
  const { slug, category } = useParams()
  const [breakData, setBreakData] = useState(null)
  const [adjudicators, setAdjudicators] = useState([])
  const [loading, setLoading] = useState(true)

  const isAdjs = category === 'adjudicators'

  useEffect(() => {
    if (isAdjs) {
      api.getAdjudicators(slug)
        .then(data => setAdjudicators(data.filter(a => a.is_breaking)))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      api.getBreaks(slug)
        .then(data => {
          const cat = data.find(b => b.slug === category || b.name.toLowerCase() === category)
          setBreakData(cat || null)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [slug, category])

  const teamColumns = [
    {
      key: 'rank',
      label: '',
      sortable: false,
      render: (v) => <span className="rank-cell">{v}</span>
    },
    {
      key: 'break_rank',
      label: 'Break',
      render: (v) => <span style={{ color: 'var(--text-secondary)' }}>{v ?? '—'}</span>
    },
    {
      key: 'team_name',
      label: 'Team',
      icon: <span>👥</span>,
      render: (v) => <span className="name-cell">{v}</span>
    },
    {
      key: 'institution',
      label: 'Institution',
      render: (v) => <span style={{ color: 'var(--text-secondary)' }}>{v || '—'}</span>
    },
    {
      key: 'wins',
      label: 'Wins',
      align: 'right',
      render: (v) => <span className="score-cell">{v ?? '—'}</span>
    },
    {
      key: 'speaks',
      label: 'Spk',
      align: 'right',
      render: (v) => {
        if (!v) return '—'
        const parts = v.toFixed(2).split('.')
        return <span className="score-cell">{parts[0]}<span className="decimal">.{parts[1]}</span></span>
      }
    },
  ]

  const adjColumns = [
    {
      key: 'rank',
      label: '',
      sortable: false,
      render: (v) => <span className="rank-cell">{v}</span>
    },
    {
      key: 'name',
      label: 'Adjudicator',
      icon: <span>👤</span>,
      render: (v) => <span className="name-cell">{v}</span>
    },
    {
      key: 'institution',
      label: 'Institution',
      render: (v) => <span style={{ color: 'var(--text-secondary)' }}>{v || '—'}</span>
    },
  ]

  // Build team rows from break data
  const teamRows = breakData?.breaking_teams?.map((bt, i) => ({
    id: bt.id,
    rank: i + 1,
    break_rank: bt.rank,
    team_name: bt.team?.name || '—',
    institution: bt.team?.institution || '—',
    wins: null,
    speaks: null,
  })) || []

  const adjRows = adjudicators.map((a, i) => ({ ...a, rank: i + 1 }))

  const title = isAdjs
    ? 'Breaking Adjudicators'
    : breakData
      ? `${breakData.name} Break`
      : `${category?.charAt(0).toUpperCase()}${category?.slice(1)} Break`

  const emoji = isAdjs ? '⚖️' : '👑'

  return (
    <div className="page">
      <TabbycatNav />
      <div className="container">
        <h1 className="page-title">
          <span className="emoji">{emoji}</span>
          {title}
        </h1>
        {loading ? (
          <div className="spinner" />
        ) : isAdjs ? (
          <TabTable
            columns={adjColumns}
            rows={adjRows}
            searchKeys={['name', 'institution']}
            emptyText="No breaking adjudicators found."
          />
        ) : (
          <TabTable
            columns={teamColumns}
            rows={teamRows}
            searchKeys={['team_name', 'institution']}
            emptyText="No breaking teams found."
          />
        )}
      </div>
    </div>
  )
}
