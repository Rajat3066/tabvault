const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// ── Tournaments ──────────────────────────────────────────────────────────────

async function getTournamentBySlug(slug) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function getTournamentByUrl(originalUrl) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('original_url', originalUrl)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function insertTournament(t) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert(t)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateTournament(id, fields) {
  const { error } = await supabase
    .from('tournaments')
    .update(fields)
    .eq('id', id)
  if (error) throw error
}

async function listTournaments({ format, year } = {}) {
  let query = supabase.from('tournaments').select('*').order('date', { ascending: false })
  if (format) query = query.eq('format', format)
  if (year) query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  const { data, error } = await query
  if (error) throw error
  return data
}

// ── Rounds ───────────────────────────────────────────────────────────────────

async function insertRounds(rounds) {
  const { error } = await supabase.from('rounds').insert(rounds)
  if (error) throw error
}

async function getRounds(tournamentId) {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seq')
  if (error) throw error
  return data
}

// ── Teams ────────────────────────────────────────────────────────────────────

async function insertTeams(teams) {
  const { data, error } = await supabase.from('teams').insert(teams).select()
  if (error) throw error
  return data
}

async function getTeams(tournamentId) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('points', { ascending: false })
  if (error) throw error
  return data
}

// ── Speakers ─────────────────────────────────────────────────────────────────

async function insertSpeakers(speakers) {
  const { error } = await supabase.from('speakers').insert(speakers)
  if (error) throw error
}

async function getSpeakers(tournamentId) {
  const { data, error } = await supabase
    .from('speakers')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('total_speaks', { ascending: false })
  if (error) throw error
  return data
}

// ── Adjudicators ─────────────────────────────────────────────────────────────

async function insertAdjudicators(adjs) {
  const { error } = await supabase.from('adjudicators').insert(adjs)
  if (error) throw error
}

async function getAdjudicators(tournamentId) {
  const { data, error } = await supabase
    .from('adjudicators')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('score', { ascending: false })
  if (error) throw error
  return data
}

// ── Pairings ─────────────────────────────────────────────────────────────────

async function insertPairings(pairings) {
  const { error } = await supabase.from('pairings').insert(pairings)
  if (error) throw error
}

async function getPairings(roundId) {
  const { data, error } = await supabase
    .from('pairings')
    .select('*, gov_team:gov_team_id(name, institution), opp_team:opp_team_id(name, institution)')
    .eq('round_id', roundId)
  if (error) throw error
  return data
}

// ── Breaks ───────────────────────────────────────────────────────────────────

async function insertBreakCategories(cats) {
  const { data, error } = await supabase.from('break_categories').insert(cats).select()
  if (error) throw error
  return data
}

async function insertBreakingTeams(teams) {
  const { error } = await supabase.from('breaking_teams').insert(teams)
  if (error) throw error
}

async function getBreaks(tournamentId) {
  const { data, error } = await supabase
    .from('break_categories')
    .select('*, breaking_teams(rank, team:team_id(name, institution))')
    .eq('tournament_id', tournamentId)
  if (error) throw error
  return data
}

// ── Saved tournaments ────────────────────────────────────────────────────────

async function saveTourtament(userId, tournamentId, role, note) {
  const { error } = await supabase
    .from('saved_tournaments')
    .insert({ user_id: userId, tournament_id: tournamentId, role, note })
  if (error) throw error
}

async function getSavedTournaments(userId) {
  const { data, error } = await supabase
    .from('saved_tournaments')
    .select('*, tournament:tournament_id(*)')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
  if (error) throw error
  return data
}

async function deleteSavedTournament(id, userId) {
  const { error } = await supabase
    .from('saved_tournaments')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

async function updateSpeakerScores(tournamentId, name, { total_speaks, avg_speaks }) {
  const { error } = await supabase
    .from('speakers')
    .update({ total_speaks, avg_speaks })
    .eq('tournament_id', tournamentId)
    .eq('name', name)
  if (error) throw error
}

async function updateTeamScores(tournamentId, id, name, { points, speaks }) {
  let query = supabase.from('teams').update({ points, speaks }).eq('tournament_id', tournamentId)
  query = id ? query.eq('id', id) : query.eq('name', name)
  const { error } = await query
  if (error) throw error
}

async function updateRound(id, fields) {
  const { error } = await supabase
    .from('rounds')
    .update(fields)
    .eq('id', id)
  if (error) throw error
}

async function updateTeamCategories(id, categories) {
  const { error } = await supabase
    .from('teams')
    .update({ categories })
    .eq('id', id)
  if (error) throw error
}

async function updateSpeakerCategories(tournamentId, name, category) {
  const { data, error } = await supabase
    .from('speakers')
    .select('id, categories')
    .eq('tournament_id', tournamentId)
    .eq('name', name)
    .single()
  if (error) return
  const existing = data.categories || []
  if (existing.includes(category)) return
  await supabase
    .from('speakers')
    .update({ categories: [...existing, category] })
    .eq('id', data.id)
}

module.exports = {
  supabase,
  getTournamentBySlug,
  getTournamentByUrl,
  insertTournament,
  updateTournament,
  listTournaments,
  insertRounds,
  getRounds,
  insertTeams,
  getTeams,
  insertSpeakers,
  getSpeakers,
  updateSpeakerScores,  // add
  updateTeamScores,     // add
  updateRound,
  insertAdjudicators,
  getAdjudicators,
  insertPairings,
  getPairings,
  insertBreakCategories,
  insertBreakingTeams,
  getBreaks,
  saveTourtament,
  getSavedTournaments,
  deleteSavedTournament,
  updateTeamCategories,
  updateSpeakerCategories,
}

