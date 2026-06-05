import { useState, useMemo } from 'react'

export default function TabTable({ columns, rows, searchKeys = [], emptyText = 'No data available.' }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(() => {
    if (!rows) return []
    let data = rows
    if (query.trim()) {
      const q = query.toLowerCase()
      data = data.filter(row =>
        searchKeys.some(k => String(row[k] || '').toLowerCase().includes(q))
      )
    }
    if (sortKey) {
      data = [...data].sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey]
        if (av === null || av === undefined) return 1
        if (bv === null || bv === undefined) return -1
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return data
  }, [rows, query, sortKey, sortDir, searchKeys])

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div>
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

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty">{query ? 'No results found.' : emptyText}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tab-table">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                      style={{ textAlign: col.align || 'left', cursor: col.sortable === false ? 'default' : 'pointer' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                        {col.icon || col.label}
                        {sortKey === col.key && (
                          <span style={{ fontSize: 10, color: 'var(--accent)' }}>
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.id || i}>
                    {columns.map(col => (
                      <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
