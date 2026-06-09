// pages/EventFeedback.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Post-event survey for workshop attendees.
//
// What this page does:
//   1. Shows the live "Students Reached" count fetched from Supabase site_stats
//   2. Lets participants submit a before/after confidence survey → submitFeedback()
//   3. Increments students_reached by 1 on every successful submit → incrementStat()
//   4. Shows a live feed of recent responses → fetchRecentFeedback()
//   5. Admin PIN section → setStat() for manual count edits
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import {
  Star, Send, CheckCircle, Users, Lock, RefreshCw,
  ChevronDown, MessageSquare, TrendingUp, Shield, Eye, EyeOff,
} from 'lucide-react'
import SectionHeader from '../components/ui/SectionHeader'
import GlassCard from '../components/ui/GlassCard'
import {
  fetchSiteStats,
  incrementStat,
  setStat,
  submitFeedback,
  fetchRecentFeedback,
  isConfigured,
} from '../lib/supabase'

// ── Seed default from stats.json so first render isn't empty ─────────────────
const SEED_COUNT = 450

// ── GRADE OPTIONS ─────────────────────────────────────────────────────────────
const GRADE_OPTIONS = [
  'Elementary (K–5)',
  'Middle School (6–8)',
  'High School (9–12)',
  'Teacher / Educator',
  'Community Member',
  'Other',
]

// ── Star rating widget ────────────────────────────────────────────────────────
function StarRating({ value, onChange, label, color = 'text-cyan-400' }) {
  const [hover, setHover] = useState(0)

  const descriptions = ['', 'Very low', 'Low', 'Moderate', 'High', 'Very high']

  return (
    <div>
      <label className="font-mono text-xs text-white/50 mb-2 block">{label}</label>
      <div className="flex items-center gap-1 mb-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            className={`transition-all duration-150 ${
              n <= (hover || value)
                ? `${color} scale-110`
                : 'text-white/20 hover:text-white/40'
            }`}
            aria-label={`Rate ${n} out of 5`}
          >
            <Star size={28} fill={n <= (hover || value) ? 'currentColor' : 'none'} />
          </button>
        ))}
        {(hover || value) > 0 && (
          <span className={`font-mono text-xs ml-2 ${color}`}>
            {descriptions[hover || value]}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Live counter badge ────────────────────────────────────────────────────────
function LiveCounter({ count, loading }) {
  return (
    <div className="glass p-6 rounded-2xl border border-cyan-400/20 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Users size={16} className="text-cyan-400" />
        <span className="font-mono text-xs text-cyan-400 tracking-widest">STUDENTS REACHED</span>
        {loading && <RefreshCw size={12} className="text-white/30 animate-spin" />}
      </div>
      <div className="font-display text-5xl font-black cyber-text">
        {count.toLocaleString()}
        <span className="text-3xl">+</span>
      </div>
      <p className="text-white/40 text-xs mt-2">
        {isConfigured ? 'Live from Supabase' : 'Local count (configure Supabase for cloud sync)'}
      </p>
    </div>
  )
}

// ── Confidence diff badge ─────────────────────────────────────────────────────
function DiffBadge({ before, after }) {
  if (!before || !after) return null
  const diff = after - before
  const color = diff > 0 ? 'text-teal-400 border-teal-400/30 bg-teal-400/10'
              : diff < 0 ? 'text-red-400 border-red-400/30 bg-red-400/10'
              : 'text-white/40 border-white/10 bg-white/5'
  const label = diff > 0 ? `+${diff} ↑ confidence grew`
              : diff < 0 ? `${diff} ↓ confidence dropped`
              : '= no change'
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  )
}

// ── Feedback form ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  workshopName: '',
  participantName: '',
  gradeLevel: '',
  beforeRating: 0,
  afterRating: 0,
  reflection: '',
}

function FeedbackForm({ onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setRating = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.gradeLevel) { setError('Please select your grade / role.'); return }
    if (!form.beforeRating) { setError('Please rate your AI confidence before the workshop.'); return }
    if (!form.afterRating)  { setError('Please rate your AI confidence after the workshop.'); return }

    setSubmitting(true)
    try {
      const { ok } = await submitFeedback({
        workshopName:    form.workshopName    || null,
        participantName: form.participantName || null,
        gradeLevel:      form.gradeLevel,
        beforeRating:    form.beforeRating,
        afterRating:     form.afterRating,
        reflection:      form.reflection      || null,
      })

      if (ok) {
        await incrementStat('students_reached')
        onSuccess({ ...form })
        setForm(EMPTY_FORM)
      } else {
        setError('Submission failed — please try again.')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Workshop + name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">
            Workshop / Event Name
          </label>
          <input
            value={form.workshopName}
            onChange={set('workshopName')}
            placeholder="e.g. Lincoln Middle School — AI Workshop"
            className="input-field"
          />
        </div>
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">
            Your Name <span className="text-white/30">(optional)</span>
          </label>
          <input
            value={form.participantName}
            onChange={set('participantName')}
            placeholder="Anonymous is fine"
            className="input-field"
          />
        </div>
      </div>

      {/* Grade level */}
      <div>
        <label className="font-mono text-xs text-white/50 mb-1 block">
          Grade Level / Role <span className="text-cyan-400">*</span>
        </label>
        <select
          required
          value={form.gradeLevel}
          onChange={set('gradeLevel')}
          className="input-field"
        >
          <option value="" disabled>Select your grade or role…</option>
          {GRADE_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      {/* Before / after ratings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="font-mono text-xs text-white/60">BEFORE the workshop</span>
          </div>
          <StarRating
            value={form.beforeRating}
            onChange={setRating('beforeRating')}
            label="AI / Cybersecurity confidence *"
            color="text-red-400"
          />
        </div>
        <div className="glass p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-teal-400" />
            <span className="font-mono text-xs text-white/60">AFTER the workshop</span>
          </div>
          <StarRating
            value={form.afterRating}
            onChange={setRating('afterRating')}
            label="AI / Cybersecurity confidence *"
            color="text-teal-400"
          />
        </div>
      </div>

      {/* Live diff */}
      {form.beforeRating > 0 && form.afterRating > 0 && (
        <div className="flex items-center gap-3">
          <TrendingUp size={14} className="text-white/40" />
          <DiffBadge before={form.beforeRating} after={form.afterRating} />
        </div>
      )}

      {/* Reflection */}
      <div>
        <label className="font-mono text-xs text-white/50 mb-1 block">
          Short Reflection <span className="text-white/30">(optional)</span>
        </label>
        <textarea
          value={form.reflection}
          onChange={set('reflection')}
          rows={4}
          placeholder="What surprised you most? What's one thing you'll remember? Any questions about AI you still have?"
          className="input-field resize-none"
        />
        <p className="text-white/25 text-xs mt-1 font-mono">
          {form.reflection.length}/500 characters
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="glass p-3 rounded-xl border border-red-400/30 bg-red-400/5 flex items-center gap-2">
          <Shield size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-cyber w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? <><RefreshCw size={16} className="animate-spin" /> Submitting…</>
          : <><Send size={16} /> Submit Feedback</>
        }
      </button>

      <p className="text-center text-xs text-white/25 font-mono">
        Responses are anonymous by default. Each submission increments the Students Reached counter.
      </p>
    </form>
  )
}

// ── Success state ─────────────────────────────────────────────────────────────
function SuccessCard({ submission, onAnother }) {
  const diff = submission.afterRating - submission.beforeRating

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-teal-400/10 border border-teal-400/30 flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-teal-400" />
      </div>
      <h3 className="font-display text-2xl font-bold mb-2">Thank you!</h3>
      <p className="text-white/60 mb-6">
        Your feedback has been recorded{' '}
        {isConfigured ? 'and saved to the cloud' : 'locally'}.
        The Students Reached counter has been updated.
      </p>

      {/* Mini summary */}
      <div className="glass p-5 rounded-2xl border border-white/10 text-left max-w-sm mx-auto mb-8 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Confidence before</span>
          <span className="text-red-400 font-mono">{'★'.repeat(submission.beforeRating)}{'☆'.repeat(5 - submission.beforeRating)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Confidence after</span>
          <span className="text-teal-400 font-mono">{'★'.repeat(submission.afterRating)}{'☆'.repeat(5 - submission.afterRating)}</span>
        </div>
        <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
          <span className="text-white/50">Change</span>
          <DiffBadge before={submission.beforeRating} after={submission.afterRating} />
        </div>
      </div>

      <button onClick={onAnother} className="btn-outline flex items-center gap-2 mx-auto">
        Submit Another Response
      </button>
    </div>
  )
}

// ── Recent feedback feed ──────────────────────────────────────────────────────
function RecentFeed({ feed, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass p-4 rounded-xl border border-white/10 animate-pulse">
            <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }
  if (!feed.length) {
    return (
      <div className="glass p-8 rounded-xl border border-white/10 text-center text-white/30">
        <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No responses yet — be the first!</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {feed.map((item, i) => {
        const diff = item.after_rating - item.before_rating
        const diffColor = diff > 0 ? 'text-teal-400' : diff < 0 ? 'text-red-400' : 'text-white/40'
        const diffLabel = diff > 0 ? `+${diff}` : `${diff}`
        return (
          <div
            key={item.id ?? item._local_id ?? i}
            className="glass p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-cyan-400 border border-cyan-400/20 bg-cyan-400/5 px-2 py-0.5 rounded-full">
                  {item.grade_level}
                </span>
                {item.workshop_name && (
                  <span className="font-mono text-xs text-white/30">
                    {item.workshop_name}
                  </span>
                )}
              </div>
              <span className={`font-display font-bold text-sm flex-shrink-0 ${diffColor}`}>
                {diff > 0 ? diffLabel + ' ↑' : diff < 0 ? diffLabel + ' ↓' : '= '}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-1 text-xs text-white/40">
                <span className="text-red-400 font-mono">{'★'.repeat(item.before_rating)}</span>
                <span className="mx-1 text-white/20">→</span>
                <span className="text-teal-400 font-mono">{'★'.repeat(item.after_rating)}</span>
              </div>
            </div>
            {item.comment && (
              <p className="text-white/60 text-xs leading-relaxed line-clamp-2">
                "{item.comment}"
              </p>
            )}
            <p className="text-white/20 text-xs font-mono mt-1">
              {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Just now'}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ── Admin PIN panel ───────────────────────────────────────────────────────────
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1234'

function AdminPanel({ currentCount, onCountUpdated }) {
  const [open, setOpen] = useState(false)
  const [pin, setPin]   = useState('')
  const [showPin, setShowPin] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [pinError, setPinError] = useState('')

  // Edit state
  const [editKey, setEditKey]     = useState('students_reached')
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState('')

  const STAT_OPTIONS = [
    { key: 'students_reached',    label: 'Students Reached' },
    { key: 'workshops_conducted', label: 'Workshops Conducted' },
    { key: 'community_partners',  label: 'Community Partners' },
    { key: 'schools_visited',     label: 'Schools Visited' },
  ]

  const handleUnlock = () => {
    if (pin === ADMIN_PIN) { setUnlocked(true); setPinError('') }
    else { setPinError('Incorrect PIN. Try again.'); setPin('') }
  }

  const handleSave = async () => {
    const num = parseInt(editValue, 10)
    if (isNaN(num) || num < 0) { setSaveMsg('Please enter a valid number.'); return }
    setSaving(true); setSaveMsg('')
    const { error } = await setStat(editKey, num)
    setSaving(false)
    if (error) { setSaveMsg('Save failed — check console.'); return }
    setSaveMsg(`✓ ${STAT_OPTIONS.find(o => o.key === editKey)?.label} set to ${num.toLocaleString()}`)
    onCountUpdated(editKey, num)
    setEditValue('')
  }

  return (
    <div className="glass rounded-2xl border border-violet-400/20">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <Lock size={16} className="text-violet-400" />
          <span className="font-display text-sm tracking-wide text-violet-400">Admin Panel</span>
          <span className="font-mono text-xs text-white/30 border border-white/10 px-2 py-0.5 rounded-full">
            PIN protected
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 p-5">
          {!unlocked ? (
            <div className="space-y-3 max-w-xs">
              <p className="text-white/50 text-sm">Enter your admin PIN to edit the counters manually.</p>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => { setPin(e.target.value); setPinError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  placeholder="Enter PIN"
                  maxLength={8}
                  className="input-field pr-10 tracking-widest font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {pinError && <p className="text-red-400 text-xs font-mono">{pinError}</p>}
              <button onClick={handleUnlock} className="btn-violet w-full text-xs py-2">
                Unlock
              </button>
              <p className="text-white/20 text-xs font-mono">
                Set VITE_ADMIN_PIN in .env to change the default PIN (1234).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-teal-400" />
                <span className="text-teal-400 font-mono text-xs">Admin unlocked</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Stat key */}
                <div>
                  <label className="font-mono text-xs text-white/50 mb-1 block">Stat to edit</label>
                  <select
                    value={editKey}
                    onChange={e => setEditKey(e.target.value)}
                    className="input-field"
                  >
                    {STAT_OPTIONS.map(o => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* New value */}
                <div>
                  <label className="font-mono text-xs text-white/50 mb-1 block">New value</label>
                  <input
                    type="number"
                    min="0"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder={`Current: ${currentCount.toLocaleString()}`}
                    className="input-field"
                  />
                </div>

                {/* Save button */}
                <div className="flex items-end">
                  <button
                    onClick={handleSave}
                    disabled={saving || !editValue}
                    className="btn-violet w-full text-xs py-3 disabled:opacity-40"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {saveMsg && (
                <p className={`font-mono text-xs ${saveMsg.startsWith('✓') ? 'text-teal-400' : 'text-red-400'}`}>
                  {saveMsg}
                </p>
              )}

              <div className="glass p-3 rounded-xl border border-white/8 text-xs text-white/30 font-mono">
                {isConfigured
                  ? '✓ Connected to Supabase — changes persist to cloud'
                  : '⚠ Supabase not configured — changes saved to localStorage only'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EventFeedback() {
  const [studentsCount, setStudentsCount] = useState(SEED_COUNT)
  const [statsLoading,  setStatsLoading]  = useState(true)
  const [feed,          setFeed]          = useState([])
  const [feedLoading,   setFeedLoading]   = useState(true)
  const [submitted,     setSubmitted]     = useState(false)
  const [lastSubmission, setLastSubmission] = useState(null)

  // Load live count + recent feed on mount
  const loadData = useCallback(async () => {
    setStatsLoading(true)
    setFeedLoading(true)
    try {
      const [stats, recent] = await Promise.all([
        fetchSiteStats(),
        fetchRecentFeedback(8),
      ])
      if (stats?.students_reached != null) setStudentsCount(stats.students_reached)
      setFeed(recent || [])
    } catch (e) {
      console.warn('loadData error', e)
    } finally {
      setStatsLoading(false)
      setFeedLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSuccess = (submission) => {
    setLastSubmission(submission)
    setSubmitted(true)
    // Optimistically bump the counter without a second network call
    setStudentsCount(c => c + 1)
    // Prepend to feed immediately
    setFeed(f => [{
      _local_id:    Date.now(),
      grade_level:  submission.gradeLevel,
      workshop_name: submission.workshopName || null,
      before_rating: submission.beforeRating,
      after_rating:  submission.afterRating,
      comment:       submission.reflection   || null,
      created_at:    new Date().toISOString(),
    }, ...f].slice(0, 8))
  }

  const handleAnother = () => {
    setSubmitted(false)
    setLastSubmission(null)
  }

  const handleAdminCountUpdated = (key, value) => {
    if (key === 'students_reached') setStudentsCount(value)
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">

        <SectionHeader
          tag="Event Feedback"
          title="How Did This Workshop"
          highlight="Change Your View?"
          subtitle="Tell us how your confidence in AI and cybersecurity changed — your response helps us improve and counts toward the Students Reached total."
        />

        {/* Live counter + backend badge */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="md:col-span-1">
            <LiveCounter count={studentsCount} loading={statsLoading} />
          </div>
          <div className="md:col-span-2 glass p-6 rounded-2xl border border-white/10 flex flex-col justify-center gap-3">
            <h3 className="font-display text-lg font-bold">How this works</h3>
            <ul className="space-y-2">
              {[
                'Fill out the short survey below after attending a workshop.',
                'Your rating is saved instantly — every response increments the Students Reached count.',
                'Responses appear in the live feed so the community can see impact in real time.',
                'No account needed. Your name is optional.',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <span className="text-cyan-400 font-mono text-xs mt-0.5 flex-shrink-0">
                    0{i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Two-column: form + live feed */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">

          {/* Form — wider column */}
          <div className="lg:col-span-3">
            <GlassCard hover={false} color="cyber">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare size={18} className="text-cyan-400" />
                <h2 className="font-display text-xl font-bold">Submit Your Feedback</h2>
              </div>
              {submitted && lastSubmission
                ? <SuccessCard submission={lastSubmission} onAnother={handleAnother} />
                : <FeedbackForm onSuccess={handleSuccess} />
              }
            </GlassCard>
          </div>

          {/* Live feed — narrower column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm tracking-wide text-white/70">
                Recent Responses
              </h3>
              <button
                onClick={loadData}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-cyan-400 transition-colors font-mono"
              >
                <RefreshCw size={12} /> refresh
              </button>
            </div>
            <RecentFeed feed={feed} loading={feedLoading} />
          </div>
        </div>

        {/* Admin panel */}
        <AdminPanel
          currentCount={studentsCount}
          onCountUpdated={handleAdminCountUpdated}
        />

      </div>
    </div>
  )
}
