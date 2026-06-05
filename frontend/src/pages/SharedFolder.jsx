import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import './Folders.css'

export default function SharedFolder() {
  const { token } = useParams()
  const [folder, setFolder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getSharedFolder(token)
      .then(setFolder)
      .catch(() => setError('Folder not found or not public'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="folders-page"><div className="spinner" /></div>
  if (error) return (
    <div className="folders-page">
      <div className="folders-unauth">
        <div className="folders-unauth-icon">🔒</div>
        <h2>{error}</h2>
        <Link to="/" className="folders-signin-btn">Go Home</Link>
      </div>
    </div>
  )

  return (
    <div className="folders-page">
      <div className="folders-header">
        <div className="folders-header-inner">
          <Link to="/" className="comp-back">← Back</Link>
          <h1 className="comp-title">{folder.name}</h1>
          {folder.description && <p className="comp-subtitle">{folder.description}</p>}
        </div>
      </div>
      <main className="folders-main">
        <div className="folder-items" style={{ background: 'rgba(13,31,53,0.8)', borderRadius: 12, border: '1px solid rgba(74,143,196,0.12)' }}>
          {folder.folder_items?.length === 0 ? (
            <div className="folder-empty-items">No tournaments in this folder.</div>
          ) : (
            folder.folder_items?.map(item => (
              <div key={item.id} className="folder-item">
                <div className="folder-item-left">
                  <Link to={`/archive/${item.tournament?.slug}`} className="folder-item-name">
                    {item.tournament?.name}
                  </Link>
                  {item.note && <span className="folder-item-note">{item.note}</span>}
                </div>
                <div className="folder-item-right">
                  <Link to={`/archive/${item.tournament?.slug}`} className="folder-item-view">View →</Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}