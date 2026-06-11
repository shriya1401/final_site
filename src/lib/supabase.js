// src/lib/supabase.js
// Single shared Supabase client for the whole app.
//
// SETUP:
//   1. supabase.com → New project
//   2. Run supabase/schema.sql in the SQL Editor
//   3. Copy Project URL + anon key into .env:
//        VITE_SUPABASE_URL=https://xxxx.supabase.co
//        VITE_SUPABASE_ANON_KEY=your-anon-key
//   4. npm install && npm run dev
//
// When env vars are missing, isConfigured = false and every function
// falls back to localStorage so the site works offline / without a project.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isConfigured =
  SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20

export const supabase = createClient(
  SUPABASE_URL      || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
)

// ── Table name constants ─────────────────────────────────────────────────────
export const TABLES = {
  SITE_STATS:     'site_stats',
  EVENT_FEEDBACK: 'event_feedback',
  WORKSHOPS:      'workshops',
}

// ── Site Stats ───────────────────────────────────────────────────────────────

/** Returns { students_reached, workshops_conducted, … } or null on error. */
export async function fetchSiteStats() {
  if (!isConfigured) return _localGetStats()

  const { data, error } = await supabase
    .from(TABLES.SITE_STATS)
    .select('key, value')

  if (error) {
    console.warn('[supabase] fetchSiteStats:', error.message)
    return _localGetStats()
  }

  const map = Object.fromEntries(data.map(r => [r.key, r.value]))
  // Cache for offline fallback
  try { localStorage.setItem('ga_stats_cache', JSON.stringify({ ...map, _ts: Date.now() })) } catch {}
  return map
}

/** Increment a stat key by delta (default 1). */
export async function incrementStat(key, delta = 1) {
  // Always update local cache immediately so the UI is snappy
  const local = _localGetStats()
  local[key] = (local[key] ?? 0) + delta
  _localSaveStats(local)

  if (!isConfigured) return

  const { data: row, error: re } = await supabase
    .from(TABLES.SITE_STATS).select('value').eq('key', key).single()

  if (re) { console.warn('[supabase] incrementStat read:', re.message); return }

  const { error: we } = await supabase
    .from(TABLES.SITE_STATS)
    .update({ value: row.value + delta, updated_at: new Date().toISOString() })
    .eq('key', key)

  if (we) console.warn('[supabase] incrementStat write:', we.message)
}

/** Directly set a stat value (admin only). */
export async function setStat(key, value) {
  // Update local immediately
  const local = _localGetStats()
  local[key] = value
  _localSaveStats(local)

  if (!isConfigured) return { error: null }

  return supabase
    .from(TABLES.SITE_STATS)
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
}

// ── Event Feedback ───────────────────────────────────────────────────────────

/**
 * Submit post-event feedback.
 * Returns { ok: boolean, source: 'cloud' | 'local' }
 */
export async function submitFeedback({
  workshopName,
  participantName,
  gradeLevel,
  beforeRating,
  afterRating,
  reflection,
  sessionId,
}) {
  const row = {
    workshop_name:    workshopName    || null,
    participant_name: participantName || null,
    grade_level:      gradeLevel,
    before_rating:    beforeRating,
    after_rating:     afterRating,
    comment:          reflection      || null,
    session_id:       sessionId       || null,
  }

  // Always persist locally first
  _localAppend('ga_event_feedback', row)

  if (!isConfigured) return { ok: true, source: 'local' }

  const { error } = await supabase.from(TABLES.EVENT_FEEDBACK).insert(row)

  if (error) {
    console.warn('[supabase] submitFeedback:', error.message)
    return { ok: false, source: 'local' }
  }

  return { ok: true, source: 'cloud' }
}

/** Fetch recent feedback rows for the live feed. */
export async function fetchRecentFeedback(limit = 10) {
  if (!isConfigured) return _localGet('ga_event_feedback').slice(0, limit)

  const { data, error } = await supabase
    .from(TABLES.EVENT_FEEDBACK)
    .select('id, created_at, grade_level, before_rating, after_rating, comment, workshop_name, participant_name')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[supabase] fetchRecentFeedback:', error.message)
    return _localGet('ga_event_feedback').slice(0, limit)
  }
  return data
}

// ── Workshop Requests ────────────────────────────────────────────────────────

export async function submitWorkshopRequest({ name, organization, email, gradeLevel, numStudents, preferredDate, message }) {
  const row = { name, organization, email, grade_level: gradeLevel || null, num_students: numStudents ? parseInt(numStudents, 10) : null, preferred_date: preferredDate || null, message: message || null }
  _localAppend('ga_workshop_requests', row)
  if (!isConfigured) return { ok: true, source: 'local' }
  const { error } = await supabase.from(TABLES.WORKSHOPS).insert(row)
  if (error) { console.warn('[supabase] submitWorkshopRequest:', error.message); return { ok: false, source: 'local' } }
  return { ok: true, source: 'cloud' }
}

// ── localStorage helpers ─────────────────────────────────────────────────────
function _localGetStats() {
  try {
    const cache = localStorage.getItem('ga_stats_cache')
    if (cache) {
      const d = JSON.parse(cache)
      if (Date.now() - d._ts < 5 * 60 * 1000) return d
    }
    return JSON.parse(localStorage.getItem('ga_stats') || 'null') || {
      students_reached: 100, workshops_conducted: 4, community_partners: 6, schools_visited: 2,
    }
  } catch { return { students_reached: 100, workshops_conducted: 5, community_partners: 6, schools_visited: 3 } }
}
function _localSaveStats(obj) {
  try { localStorage.setItem('ga_stats', JSON.stringify(obj)); localStorage.setItem('ga_stats_cache', JSON.stringify({ ...obj, _ts: Date.now() })) } catch {}
}
function _localAppend(key, item) {
  try { const a = _localGet(key); a.unshift({ ...item, _local_id: Date.now(), created_at: new Date().toISOString() }); localStorage.setItem(key, JSON.stringify(a.slice(0, 200))) } catch {}
}
function _localGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
