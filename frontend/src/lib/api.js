const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  // ── Tournaments ──────────────────────────────────────────────
  listTournaments: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return get(`/api/tournaments${q ? '?' + q : ''}`)
  },
  getTournament: (slug) => get(`/api/tournaments/${slug}`),
  getRounds: (slug) => get(`/api/tournaments/${slug}/rounds`),
  getTeams: (slug) => get(`/api/tournaments/${slug}/teams`),
  getSpeakers: (slug) => get(`/api/tournaments/${slug}/speakers`),
  getAdjudicators: (slug) => get(`/api/tournaments/${slug}/adjudicators`),
  getBreaks: (slug) => get(`/api/tournaments/${slug}/breaks`),
  getParticipants: (slug) => get(`/api/tournaments/${slug}/participants`),
  getRoundResults: (slug, seq) => get(`/api/tournaments/${slug}/rounds/${seq}/results`),
  submit: (url) => post('/api/submit', { url }),
  getSaved: (user_id) => get(`/api/saved?user_id=${user_id}`),
  saveTournament: (body) => post('/api/saved', body),

  // ── Folders ──────────────────────────────────────────────────
  getFolders: (user_id) => get(`/api/folders?user_id=${user_id}`),
  createFolder: (user_id, name, description) => post('/api/folders', { user_id, name, description }),
  updateFolder: (id, body) => patch(`/api/folders/${id}`, body),
  deleteFolder: (id) => del(`/api/folders/${id}`),
  getSharedFolder: (token) => get(`/api/folders/shared/${token}`),

  // ── Folder items ─────────────────────────────────────────────
  addToFolder: (folder_id, tournament_id, note) => post(`/api/folders/${folder_id}/items`, { tournament_id, note }),
  updateFolderItem: (folder_id, item_id, note) => patch(`/api/folders/${folder_id}/items/${item_id}`, { note }),
  removeFromFolder: (folder_id, item_id) => del(`/api/folders/${folder_id}/items/${item_id}`),
   getMotions: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return get(`/api/motions${q ? '?' + q : ''}`)
  },
  getMotionsCount: () => get('/api/motions/count'),
  tagMotions: () => post('/api/admin/tag-motions', {}),
}

