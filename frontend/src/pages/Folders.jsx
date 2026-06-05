import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import './Folders.css'

const MAX_FOLDERS = 6

export default function Folders() {
  const [user, setUser] = useState(null)
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null
      setUser(u)
      if (u) loadFolders(u.id)
      else setLoading(false)
    })
  }, [])

  async function loadFolders(user_id) {
    setLoading(true)
    try {
      const data = await api.getFolders(user_id)
      setFolders(data)
    } catch {
      setError('Failed to load folders')
    } finally {
      setLoading(false)
    }
  }

  async function createFolder(e) {
    e.preventDefault()
    if (!newName.trim()) return
    if (folders.length >= MAX_FOLDERS) return setError(`Maximum ${MAX_FOLDERS} folders allowed`)
    try {
      const folder = await api.createFolder(user.id, newName.trim(), newDesc.trim())
      setFolders(prev => [{ ...folder, folder_items: [] }, ...prev])
      setNewName('')
      setNewDesc('')
      setCreating(false)
    } catch {
      setError('Failed to create folder')
    }
  }

  async function deleteFolder(id) {
    if (!confirm('Delete this folder? This cannot be undone.')) return
    try {
      await api.deleteFolder(id)
      setFolders(prev => prev.filter(f => f.id !== id))
    } catch {
      setError('Failed to delete folder')
    }
  }

  async function togglePublic(folder) {
    try {
      const updated = await api.updateFolder(folder.id, { is_public: !folder.is_public })
      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, ...updated } : f))
    } catch {
      setError('Failed to update folder')
    }
  }

  if (!user) return (
    <div className="folders-page">
      <div className="folders-unauth">
        <div className="folders-unauth-icon">🔒</div>
        <h2>Sign in to use Folders</h2>
        <p>Create folders to organise your favourite tournaments.</p>
        <Link to="/" className="folders-signin-btn">Go to Home</Link>
      </div>
    </div>
  )

  return (
    <div className="folders-page">
      <div className="folders-header">
        <div className="folders-header-inner">
          <Link to="/" className="comp-back">← Back</Link>
          <motion.h1
            className="comp-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Your Folders
          </motion.h1>
          <motion.p
            className="comp-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {folders.length}/{MAX_FOLDERS} folders used
          </motion.p>
        </div>
      </div>

      <main className="folders-main">
        {error && <div className="folders-error" onClick={() => setError(null)}>{error} ×</div>}

        {/* Create folder button */}
        {!creating && folders.length < MAX_FOLDERS && (
          <motion.button
            className="folders-create-btn"
            onClick={() => setCreating(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ y: -2 }}
          >
            <span>+</span> New Folder
          </motion.button>
        )}

        {/* Create folder form */}
        <AnimatePresence>
          {creating && (
            <motion.form
              className="folders-create-form"
              onSubmit={createFolder}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <input
                className="folders-input"
                placeholder="Folder name e.g. WSDC 2025"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                required
              />
              <input
                className="folders-input"
                placeholder="Description (optional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
              <div className="folders-form-actions">
                <button type="submit" className="folders-save-btn">Create</button>
                <button type="button" className="folders-cancel-btn" onClick={() => setCreating(false)}>Cancel</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Folders grid */}
        {loading ? (
          <div className="spinner" />
        ) : folders.length === 0 ? (
          <div className="folders-empty">
            <div className="folders-empty-icon">📁</div>
            <p>No folders yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="folders-grid">
            <AnimatePresence>
              {folders.map((folder, i) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  index={i}
                  onDelete={() => deleteFolder(folder.id)}
                  onTogglePublic={() => togglePublic(folder)}
                  onUpdate={(updated) => setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, ...updated } : f))}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}

function FolderCard({ folder, index, onDelete, onTogglePublic, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const [editDesc, setEditDesc] = useState(folder.description || '')
  const shareUrl = `${window.location.origin}/folders/shared/${folder.share_token}`

  async function saveEdit(e) {
    e.preventDefault()
    try {
      const updated = await api.updateFolder(folder.id, { name: editName, description: editDesc })
      onUpdate(updated)
      setEditing(false)
    } catch {}
  }

  async function removeItem(item_id) {
    try {
      await api.removeFromFolder(folder.id, item_id)
      onUpdate({
        folder_items: folder.folder_items.filter(i => i.id !== item_id)
      })
    } catch {}
  }

  async function updateNote(item_id, note) {
    try {
      await api.updateFolderItem(folder.id, item_id, note)
      onUpdate({
        folder_items: folder.folder_items.map(i => i.id === item_id ? { ...i, note } : i)
      })
    } catch {}
  }

  return (
    <motion.div
      className="folder-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Folder header */}
      <div className="folder-card-header">
        {editing ? (
          <form onSubmit={saveEdit} className="folder-edit-form">
            <input
              className="folders-input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              required
            />
            <input
              className="folders-input"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Description"
            />
            <div className="folders-form-actions">
              <button type="submit" className="folders-save-btn">Save</button>
              <button type="button" className="folders-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="folder-title-row">
              <span className="folder-icon">📁</span>
              <div>
                <h3 className="folder-name">{folder.name}</h3>
                {folder.description && <p className="folder-desc">{folder.description}</p>}
              </div>
            </div>
            <div className="folder-actions">
              <span className="folder-count">{folder.folder_items?.length || 0} tournaments</span>
              <button className="folder-action-btn" onClick={() => setEditing(true)} title="Edit">✏️</button>
              <button className="folder-action-btn" onClick={onTogglePublic} title={folder.is_public ? 'Make private' : 'Make public'}>
                {folder.is_public ? '🔓' : '🔒'}
              </button>
              <button className="folder-action-btn danger" onClick={onDelete} title="Delete">🗑️</button>
              <button className="folder-expand-btn" onClick={() => setExpanded(o => !o)}>
                {expanded ? '▲' : '▼'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Share link */}
      {folder.is_public && (
        <div className="folder-share">
          <span className="folder-share-label">Share link:</span>
          <input className="folder-share-input" value={shareUrl} readOnly onClick={e => e.target.select()} />
          <button className="folder-copy-btn" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy</button>
        </div>
      )}

      {/* Tournament list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="folder-items"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {!folder.folder_items?.length ? (
              <div className="folder-empty-items">No tournaments added yet.</div>
            ) : (
              folder.folder_items.map(item => (
                <FolderItem
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onUpdateNote={(note) => updateNote(item.id, note)}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FolderItem({ item, onRemove, onUpdateNote }) {
  const [editingNote, setEditingNote] = useState(false)
  const [note, setNote] = useState(item.note || '')
  const t = item.tournament

  async function saveNote() {
    await onUpdateNote(note)
    setEditingNote(false)
  }

  return (
    <div className="folder-item">
      <div className="folder-item-left">
        <Link to={`/archive/${t?.slug}`} className="folder-item-name">{t?.name || 'Unknown'}</Link>
        {editingNote ? (
          <div className="folder-note-edit">
            <input
              className="folders-input"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Open Winners, Broke to semis..."
              autoFocus
            />
            <button className="folders-save-btn" onClick={saveNote}>Save</button>
            <button className="folders-cancel-btn" onClick={() => setEditingNote(false)}>Cancel</button>
          </div>
        ) : (
          <span className="folder-item-note" onClick={() => setEditingNote(true)}>
            {item.note || <span className="folder-note-placeholder">+ Add note</span>}
          </span>
        )}
      </div>
      <div className="folder-item-right">
        <Link to={`/archive/${t?.slug}`} className="folder-item-view">View →</Link>
        <button className="folder-item-remove" onClick={onRemove}>×</button>
      </div>
    </div>
  )
}