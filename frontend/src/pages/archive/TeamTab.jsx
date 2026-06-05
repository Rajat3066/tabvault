import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import TabbycatNav from '../../components/TabbycatNav'
import TabTable from '../../components/TabTable'
import { api } from '../../lib/api'

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(n) ? null : n
}

function formatNumber(value) {
  const n = numberOrNull(value)
  if (n === null) return '—'

  const parts = n.toFixed(2).split('.')
  return (
    <span className="score-cell">
      {parts[0]}
      <span className="decimal">.{parts[1]}</span>
    </span>
  )
}

function renderRoundCell(value, meta) {
  if (!value) {
    return <span style={{ color: 'var(--text-secondary)' }}>—</span>
  }

  const result = meta?.result
  const showArrow = result === 'win' || result === 'loss'
  const arrow = result === 'loss' ? '⌄' : '⌃'
  const arrowColor = result === 'loss' ? '#d81b60' : '#00b884'

  const lines = String(value).split('\n').map(line => line.trim()).filter(Boolean)

  return (
    <span
      className="round-cell"
      style={{
        display: 'inline-grid',
        gridTemplateColumns: showArrow ? '16px auto' : 'auto',
        columnGap: 6,
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1.15,
      }}
    >
      {showArrow && (
        <span
          aria-hidden="true"
          style={{
            color: arrowColor,
            fontSize: 24,
            fontWeight: 800,
            lineHeight: 1,
            transform: result === 'loss' ? 'translateY(-2px)' : 'translateY(2px)',
          }}
        >
          {arrow}
        </span>
      )}

      <span style={{ display: 'block', textAlign: 'left' }}>
        {lines.map((line, i) => (
          <span key={i} style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
            {line}
          </span>
        ))}
      </span>
    </span>
  )
}

function normaliseTeamRow(team, fallbackRank) {
  const tabCells = team.tab_cells || team.tabCells || []
  const summaryStart = Math.max(tabCells.length - 3, 3)

  return {
    ...team,
    rank: team.rank ?? numberOrNull(tabCells[0]) ?? fallbackRank,
    name: team.name || tabCells[1],
    institution: team.institution ?? tabCells[2] ?? null,
    points: team.points ?? numberOrNull(tabCells[summaryStart]),
    speaks: team.speaks ?? numberOrNull(tabCells[summaryStart + 1]),
    awm: team.awm ?? numberOrNull(tabCells[summaryStart + 2]),
    tab_cells: tabCells,
  }
}

export default function TeamTab() {
  const { slug, category } = useParams()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    api.getTeams(slug)
      .then(data => {
        let filtered = Array.isArray(data) ? data : []

        if (category === 'novice') {
          filtered = filtered.filter(t => t.categories?.includes('novice'))
        }

        filtered = filtered
          .map((team, i) => normaliseTeamRow(team, i + 1))
          .sort((a, b) => {
            const points = (b.points ?? -Infinity) - (a.points ?? -Infinity)
            if (points) return points
            return (b.speaks ?? -Infinity) - (a.speaks ?? -Infinity)
          })
          .map((team, i) => ({ ...team, rank: i + 1 }))

        setTeams(filtered)
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false))
  }, [slug, category])

  const isNovice = category === 'novice'

  const roundColumns = useMemo(() => {
    const maxCells = Math.max(0, ...teams.map(t => t.tab_cells?.length || 0))

    // Team tab shape:
    // 0 rank, 1 team, 2 institution, then rounds, then Wins/Spk/AWM.
    const roundCount = Math.max(0, maxCells - 6)

    return Array.from({ length: roundCount }, (_, i) => {
      const cellIndex = i + 3
      const label = `R${i + 1}`

      return {
        key: `round_${i + 1}`,
        label,
        align: 'center',
        sortable: false,
        render: (_, row) => renderRoundCell(
          row.tab_cells?.[cellIndex],
          row.tab_cells_meta?.[cellIndex]
        )
      }
    })
  }, [teams])

  const columns = [
    {
      key: 'rank',
      label: '',
      icon: <span title="Rank" style={{ fontSize: 16 }}>📊</span>,
      sortable: false,
      render: v => <span className="rank-cell">{v}</span>
    },
    {
      key: 'name',
      label: 'Team',
      icon: <span title="Team">👥</span>,
      render: v => <span className="name-cell">{v}</span>
    },
    {
      key: 'institution',
      label: 'Institution',
      icon: <span title="Institution">🏛️</span>,
      render: v => <span style={{ color: 'var(--text-secondary)' }}>{v || '—'}</span>
    },
    ...roundColumns,
    {
      key: 'points',
      label: 'Wins',
      align: 'right',
      render: v => <span className="score-cell">{v ?? '—'}</span>
    },
    {
      key: 'speaks',
      label: 'Spk',
      align: 'right',
      render: v => formatNumber(v)
    },
    {
      key: 'awm',
      label: 'AWM',
      align: 'right',
      render: v => formatNumber(v)
    },
  ]

  return (
    <div className="page">
      <TabbycatNav />
      <div className="container">
        <h1 className="page-title">
          <span className="emoji">🏆</span>
          {isNovice ? 'Novice Team Tab' : 'Team Tab'}
        </h1>

        {loading ? (
          <div className="spinner" />
        ) : (
          <TabTable
            columns={columns}
            rows={teams}
            searchKeys={['name', 'institution']}
            emptyText="No teams found."
          />
        )}
      </div>
    </div>
  )
}