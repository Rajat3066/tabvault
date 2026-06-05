import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import TabbycatNav from '../../components/TabbycatNav'
import TabTable from '../../components/TabTable'
import { api } from '../../lib/api'

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null

  const cleaned = String(value).replace(/[^0-9.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null

  const n = Number(cleaned)
  return Number.isNaN(n) ? null : n
}

function formatNumber(value, decimals = 2) {
  const n = numberOrNull(value)
  if (n === null) return '—'

  const parts = n.toFixed(decimals).split('.')
  return (
    <span className="score-cell">
      {parts[0]}
      <span className="decimal">.{parts[1]}</span>
    </span>
  )
}

function renderText(value) {
  if (!value) return <span style={{ color: 'var(--text-secondary)' }}>—</span>

  return (
    <span style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
      {String(value).split('\n').map((line, i) => (
        <span key={i} style={{ display: 'block' }}>{line}</span>
      ))}
    </span>
  )
}

function normaliseSpeakerRow(speaker, fallbackRank) {
  const tabCells = speaker.tab_cells || speaker.tabCells || []

  // Shape:
  // 0 rank, 1 speaker, 2 categories, 3 team, 4 institution,
  // then round columns, then Avg/Stdev/Num.
  const summaryStart = Math.max(tabCells.length - 3, 5)

  return {
    ...speaker,
    rank: speaker.rank ?? numberOrNull(tabCells[0]) ?? fallbackRank,
    name: speaker.name || tabCells[1],
    categories: speaker.categories || String(tabCells[2] || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    team_name: speaker.team_name ?? tabCells[3] ?? null,
    institution: speaker.institution ?? tabCells[4] ?? null,
    avg_speaks: numberOrNull(tabCells[summaryStart]) ?? speaker.avg_speaks,
    stdev: numberOrNull(tabCells[summaryStart + 1]) ?? speaker.stdev,
    num: numberOrNull(tabCells[summaryStart + 2]) ?? speaker.num,
    tab_cells: tabCells,
  }
}

export default function SpeakerTab() {
  const { slug, category } = useParams()
  const [speakers, setSpeakers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    api.getSpeakers(slug)
      .then(data => {
        let filtered = Array.isArray(data) ? data : []

        filtered = filtered
          .filter(s => !s.categories?.includes('reply'))
          .filter(s => {
            const cells = s.tab_cells || s.tabCells || []
            return cells.length >= 8 || s.avg_speaks !== null || s.total_speaks !== null
          })

        if (category === 'novice') {
          filtered = filtered.filter(s => s.categories?.includes('novice'))
        } else if (category === 'open') {
          filtered = filtered.filter(s => !s.categories?.includes('novice'))
        } else if (category === 'esl') {
          filtered = filtered.filter(s => s.categories?.includes('esl'))
        } else if (category === 'efl') {
          filtered = filtered.filter(s => s.categories?.includes('efl'))
        }

        filtered = filtered
          .map((speaker, i) => normaliseSpeakerRow(speaker, i + 1))
          .sort((a, b) => {
            const ar = numberOrNull(a.rank) ?? 999999
            const br = numberOrNull(b.rank) ?? 999999

            if (ar !== br) return ar - br

            const avg = (b.avg_speaks ?? -Infinity) - (a.avg_speaks ?? -Infinity)
            if (avg) return avg

            return (b.total_speaks ?? -Infinity) - (a.total_speaks ?? -Infinity)
          })
          .map((s, i) => ({ ...s, rank: i + 1 }))

        setSpeakers(filtered)
      })
      .catch(() => setSpeakers([]))
      .finally(() => setLoading(false))
  }, [slug, category])

  const title = {
    novice: 'Novice Speakers',
    open: 'Open Speakers',
    esl: 'ESL Speakers',
    efl: 'EFL Speakers',
  }[category] || 'Speaker Tab'

const roundColumns = useMemo(() => {
  const maxCells = Math.max(0, ...speakers.map(s => s.tab_cells?.length || 0))
  const sampleSpeaker = speakers[0]
  const hasInstitution = speakers.some(s => s.institution && s.institution.trim() !== '')
  const roundStart = hasInstitution ? 5 : 4
  const roundCount = Math.max(0, maxCells - roundStart - 3)

  return Array.from({ length: roundCount }, (_, i) => {
    const cellIndex = roundStart + i
    return {
      key: `round_${i + 1}`,
      label: `R${i + 1}`,
      align: 'right',
      sortable: false,
      render: (_, row) => formatNumber(row.tab_cells?.[cellIndex])
    }
  })
}, [speakers])

  const columns = [
    {
      key: 'rank',
      label: '',
      sortable: false,
      render: v => <span className="rank-cell">{v}</span>
    },
    {
      key: 'name',
      label: 'Speaker',
      icon: <span>👤</span>,
      render: v => <span className="name-cell">{v}</span>
    },
    {
      key: 'categories',
      label: 'Categories',
      icon: <span>👥</span>,
      sortable: false,
      render: v => (
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {(v || []).join(', ') || '—'}
        </span>
      )
    },
    {
      key: 'team_name',
      label: 'Team',
      icon: <span>👥</span>,
      render: v => renderText(v)
    },
    ...(speakers.some(s => s.institution && s.institution.trim() !== '') ? [{
      key: 'institution',
      label: 'Institution',
      icon: <span>⌂</span>,
      render: v => renderText(v)
    }] : []),
    ...roundColumns,
    {
      key: 'avg_speaks',
      label: 'Avg',
      align: 'right',
      render: v => formatNumber(v)
    },
    {
      key: 'stdev',
      label: 'Stdev',
      align: 'right',
      render: v => formatNumber(v)
    },
    {
      key: 'num',
      label: 'Num',
      align: 'right',
      render: v => numberOrNull(v) ?? '—'
    },
  ]

  return (
    <div className="page">
      <TabbycatNav />
      <div className="container">
        <h1 className="page-title">
          <span className="emoji">💯</span>
          {title}
        </h1>

        {loading ? (
          <div className="spinner" />
        ) : (
          <TabTable
            columns={columns}
            rows={speakers}
            searchKeys={['name', 'team_name', 'institution']}
            emptyText="No speakers found."
          />
        )}
      </div>
    </div>
  )
}