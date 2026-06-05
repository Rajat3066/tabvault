import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TabbycatNav from '../../components/TabbycatNav'
import TabTable from '../../components/TabTable'
import { api } from '../../lib/api'

export default function RepliesTab() {
  const { slug } = useParams()
  const [speakers, setSpeakers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSpeakers(slug)
      .then(data => {
        const replies = data.filter(s => s.categories?.includes('reply'))
        replies.sort((a, b) => (b.avg_speaks || 0) - (a.avg_speaks || 0))
        setSpeakers(replies.map((s, i) => ({ ...s, rank: i + 1 })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const columns = [
    { key: 'rank', label: '', sortable: false, render: (v) => <span className="rank-cell">{v}</span> },
    { key: 'name', label: 'Speaker', icon: <span>👤</span>, render: (v) => <span className="name-cell">{v}</span> },
    {
      key: 'categories',
      label: 'Categories',
      sortable: false,
      render: (v) => <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{(v || []).filter(c => c !== 'reply').join(', ') || '—'}</span>
    },
    {
      key: 'avg_speaks',
      label: 'Avg',
      align: 'right',
      render: (v) => {
        if (!v) return '—'
        const parts = v.toFixed(2).split('.')
        return <span className="score-cell">{parts[0]}<span className="decimal">.{parts[1]}</span></span>
      }
    },
  ]

  return (
    <div className="page">
      <TabbycatNav />
      <div className="container">
        <h1 className="page-title">
          <span className="emoji">🙋</span>
          Reply Speaker Tab
        </h1>
        {loading ? (
          <div className="spinner" />
        ) : (
          <TabTable
            columns={columns}
            rows={speakers}
            searchKeys={['name']}
            emptyText="No reply speakers found."
          />
        )}
      </div>
    </div>
  )
}
