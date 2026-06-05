const express = require('express')
const cors = require('cors')
require('dotenv').config()

const db = require('./db')
const { scrapeTournament, parseUrl } = require('./scraper')

const app = express()
app.use(cors())
app.use(express.json())

// Simple in-memory queue to prevent double-scraping
const processing = new Set()

// ── Submit ───────────────────────────────────────────────────────────────────

app.post('/api/submit', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'URL is required' })

  try {
    // Duplicate check by original URL
    const existing = await db.getTournamentByUrl(url)
    if (existing) {
      return res.json({ duplicate: true, tournament: existing })
    }

    // Parse slug for second duplicate check
    const { slug } = parseUrl(url)
    const existingBySlug = await db.getTournamentBySlug(slug)
    if (existingBySlug) {
      return res.json({ duplicate: true, tournament: existingBySlug })
    }

    // Prevent concurrent scrape of same URL
    if (processing.has(url)) {
      return res.status(409).json({ error: 'This tournament is already being scraped' })
    }

    processing.add(url)

    // Scrape async — respond immediately so client isn't waiting
    res.json({ queued: true, slug })

    scrapeTournament(url)
      .then(() => console.log(`✓ Scraped: ${slug}`))
      .catch(err => console.error(`✗ Failed: ${slug}`, err.message))
      .finally(() => processing.delete(url))

  } catch (err) {
    processing.delete(url)
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── Tournaments ───────────────────────────────────────────────────────────────

app.get('/api/tournaments', async (req, res) => {
  try {
    const { format, year } = req.query
    const data = await db.listTournaments({ format, year })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/tournaments/:slug', async (req, res) => {
  try {
    const data = await db.getTournamentBySlug(req.params.slug)
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Rounds ────────────────────────────────────────────────────────────────────

app.get('/api/tournaments/:slug/rounds', async (req, res) => {
  try {
    const tournament = await db.getTournamentBySlug(req.params.slug)
    if (!tournament) return res.status(404).json({ error: 'Not found' })
    const data = await db.getRounds(tournament.id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/tournaments/:slug/rounds/:seq/draw', async (req, res) => {
  try {
    const tournament = await db.getTournamentBySlug(req.params.slug)
    if (!tournament) return res.status(404).json({ error: 'Not found' })
    const rounds = await db.getRounds(tournament.id)
    const round = rounds.find(r => r.seq === parseInt(req.params.seq))
    if (!round) return res.status(404).json({ error: 'Round not found' })
    const data = await db.getPairings(round.id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/tournaments/:slug/rounds/:seq/results', async (req, res) => {
  try {
    const tournament = await db.getTournamentBySlug(req.params.slug)
    if (!tournament) return res.status(404).json({ error: 'Not found' })
    const rounds = await db.getRounds(tournament.id)
    const round = rounds.find(r => r.seq === parseInt(req.params.seq))
    if (!round) return res.status(404).json({ error: 'Round not found' })
    const data = await db.getPairings(round.id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Tabs ──────────────────────────────────────────────────────────────────────

app.get('/api/tournaments/:slug/teams', async (req, res) => {
  try {
    const tournament = await db.getTournamentBySlug(req.params.slug)
    if (!tournament) return res.status(404).json({ error: 'Not found' })
    const data = await db.getTeams(tournament.id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/tournaments/:slug/speakers', async (req, res) => {
  try {
    const tournament = await db.getTournamentBySlug(req.params.slug)
    if (!tournament) return res.status(404).json({ error: 'Not found' })
    const data = await db.getSpeakers(tournament.id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/tournaments/:slug/adjudicators', async (req, res) => {
  try {
    const tournament = await db.getTournamentBySlug(req.params.slug)
    if (!tournament) return res.status(404).json({ error: 'Not found' })
    const data = await db.getAdjudicators(tournament.id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/tournaments/:slug/breaks', async (req, res) => {
  try {
    const tournament = await db.getTournamentBySlug(req.params.slug)
    if (!tournament) return res.status(404).json({ error: 'Not found' })
    const data = await db.getBreaks(tournament.id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/tournaments/:slug/participants', async (req, res) => {
  try {
    const tournament = await db.getTournamentBySlug(req.params.slug)
    if (!tournament) return res.status(404).json({ error: 'Not found' })
    const [teams, speakers, adjs] = await Promise.all([
      db.getTeams(tournament.id),
      db.getSpeakers(tournament.id),
      db.getAdjudicators(tournament.id),
    ])
    res.json({ teams, speakers, adjudicators: adjs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Saved tournaments (auth required) ────────────────────────────────────────

app.post('/api/saved', async (req, res) => {
  const { user_id, tournament_id, role, note } = req.body
  if (!user_id || !tournament_id) return res.status(400).json({ error: 'user_id and tournament_id required' })
  try {
    await db.saveTourtament(user_id, tournament_id, role, note)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/saved', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  try {
    const data = await db.getSavedTournaments(user_id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/saved/:id', async (req, res) => {
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  try {
    await db.deleteSavedTournament(req.params.id, user_id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`TabVault backend running on port ${PORT}`))

// ── Folders ───────────────────────────────────────────────────────────────────

app.post('/api/folders', async (req, res) => {
  const { user_id, name, description } = req.body
  if (!user_id || !name) return res.status(400).json({ error: 'user_id and name required' })
  try {
    const { data, error } = await db.supabase
      .from('folders')
      .insert({ user_id, name, description })
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/folders', async (req, res) => {
  console.log('GET /api/folders hit', req.query)
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  try {
    const { data, error } = await db.supabase
      .from('folders')
      .select('*, folder_items(*, tournament:tournament_id(*))')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/folders/shared/:token', async (req, res) => {
  try {
    const { data, error } = await db.supabase
      .from('folders')
      .select('*, folder_items(*, tournament:tournament_id(*))')
      .eq('share_token', req.params.token)
      .eq('is_public', true)
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Folder not found or not public' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/folders/:id', async (req, res) => {
  const { name, description, is_public } = req.body
  try {
    const { data, error } = await db.supabase
      .from('folders')
      .update({ name, description, is_public })
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/folders/:id', async (req, res) => {
  try {
    const { error } = await db.supabase
      .from('folders')
      .delete()
      .eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Folder items ──────────────────────────────────────────────────────────────

app.post('/api/folders/:id/items', async (req, res) => {
  const { tournament_id, note } = req.body
  if (!tournament_id) return res.status(400).json({ error: 'tournament_id required' })
  try {
    const { data, error } = await db.supabase
      .from('folder_items')
      .insert({ folder_id: req.params.id, tournament_id, note })
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/folders/:id/items/:itemId', async (req, res) => {
  const { note } = req.body
  try {
    const { data, error } = await db.supabase
      .from('folder_items')
      .update({ note })
      .eq('id', req.params.itemId)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/folders/:id/items/:itemId', async (req, res) => {
  try {
    const { error } = await db.supabase
      .from('folder_items')
      .delete()
      .eq('id', req.params.itemId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/admin/tag-motions', async (req, res) => {
  res.json({ message: 'Tagging started in background' })
  const { tagAllMotions } = require('./motionTagger')
  tagAllMotions().catch(console.error)
})

app.get('/api/motions', async (req, res) => {
  try {
    const { type, theme, query, limit = 50, offset = 0 } = req.query

    let q = db.supabase
      .from('motion_tags')
      .select('*, tournament:tournament_id(name, slug, date)')
      .order('tagged_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (type) q = q.eq('motion_type', type)
    if (theme) q = q.contains('themes', [theme])
    if (query) q = q.ilike('motion_text', `%${query}%`)

    const { data, error } = await q
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/motions/count', async (req, res) => {
  try {
    const { count, error } = await db.supabase
      .from('motion_tags')
      .select('*', { count: 'exact', head: true })
    if (error) throw error
    res.json({ count })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})