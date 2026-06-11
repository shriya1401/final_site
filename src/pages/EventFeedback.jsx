// pages/EventFeedback.jsx
// Full pre/post workshop survey — 15 Likert questions (no open-ended)
// Produces Gold Award impact metrics automatically from responses

import { useState, useEffect, useCallback } from 'react'
import {
  Send, CheckCircle, Users, Lock, RefreshCw, ChevronDown,
  MessageSquare, TrendingUp, Shield, Eye, EyeOff, BarChart2,
  Brain, TrafficCone,
} from 'lucide-react'
import SectionHeader from '../components/ui/SectionHeader'
import GlassCard from '../components/ui/GlassCard'
import {
  fetchSiteStats, incrementStat, setStat,
  submitFeedback, fetchRecentFeedback, isConfigured,
} from '../lib/supabase'

const SEED_COUNT = 80

const GRADE_OPTIONS = [
  'Elementary (K–5)',
  'Middle School (6–8)',
  'High School (9–12)',
  'Teacher / Educator',
  'Community Member',
  'Other',
]

const SECTIONS = [
  {
    id: 'ai',
    label: 'AI Knowledge',
    icon: Brain,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-400/30',
    questions: [
      { id: 'ai1', text: 'I understand what artificial intelligence (AI) is and how it is used in everyday life.' },
      { id: 'ai2', text: 'I can explain how AI learns from data to make decisions.' },
      { id: 'ai3', text: 'I am aware of both the benefits and risks of AI technologies.' },
    ],
  },
  {
    id: 'cyber',
    label: 'Cybersecurity Awareness',
    icon: Shield,
    color: 'text-violet-400',
    borderColor: 'border-violet-400/30',
    questions: [
      { id: 'cy1', text: 'I understand the importance of cybersecurity in modern technology systems.' },
      { id: 'cy2', text: 'I feel confident identifying common online security threats such as phishing or scams.' },
      { id: 'cy3', text: 'I understand why AI systems must be protected from cyberattacks.' },
    ],
  },
  {
    id: 'traffic',
    label: 'Smart Cities & Traffic',
    icon: TrafficCone,
    color: 'text-teal-400',
    borderColor: 'border-teal-400/30',
    questions: [
      { id: 'tr1', text: 'I understand how traffic signals affect traffic flow and congestion.' },
      { id: 'tr2', text: 'I can explain how AI can improve transportation systems and public safety.' },
      { id: 'tr3', text: 'I understand how technology can help cities become more efficient and sustainable.' },
    ],
  }
]

const POST_ONLY_QUESTIONS = [
  { id: 'po1', text: 'The workshop helped me better understand how AI can solve real-world problems.' },
  { id: 'po2', text: 'The traffic simulation helped me visualize how AI can improve city infrastructure.' },
  { id: 'po3', text: 'I would recommend this workshop to other students.' },
]

const ALL_PRE_POST_IDS = SECTIONS.flatMap(s => s.questions.map(q => q.id))

const SCALE = ['', 'Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
const SCALE_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-teal-400', 'text-green-400']

function LikertRow({ questionId, text, value, onChange, phase }) {
  const accentClass = phase === 'before'
    ? 'border-red-400 bg-red-400/20 text-red-300'
    : 'border-teal-400 bg-teal-400/20 text-teal-300'
  return (
    <div className="py-3 border-b border-white/8 last:border-0">
      <p className="text-sm text-white/80 mb-3 leading-relaxed">{text}</p>
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(questionId, n)}
            className={`flex-1 min-w-[44px] py-2 rounded-lg border text-xs font-mono font-bold transition-all duration-150
              ${value === n ? accentClass : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'}`}
            title={SCALE[n]}>{n}</button>
        ))}
      </div>
      {value > 0 && (
        <p className={`text-xs font-mono mt-1.5 ${SCALE_COLORS[value]}`}>{SCALE[value]}</p>
      )}
    </div>
  )
}

function SectionBlock({ section, preValues, postValues, onChangeP, onChangeQ, phase }) {
  const Icon = section.icon
  const values = phase === 'before' ? preValues : postValues
  const onChange = phase === 'before' ? onChangeP : onChangeQ
  return (
    <div className={`glass rounded-xl border ${section.borderColor} p-4 mb-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className={section.color} />
        <span className={`font-mono text-xs tracking-wide ${section.color}`}>{section.label}</span>
      </div>
      {section.questions.map(q => (
        <LikertRow key={q.id} questionId={q.id} text={q.text}
          value={values[q.id] || 0} onChange={onChange} phase={phase} />
      ))}
    </div>
  )
}

function computeMetrics(preRatings, postRatings, postOnlyRatings) {
  const preScores  = ALL_PRE_POST_IDS.map(id => preRatings[id]  || 0).filter(v => v > 0)
  const postScores = ALL_PRE_POST_IDS.map(id => postRatings[id] || 0).filter(v => v > 0)
  const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : '—'
  const pct = (val, total) => total ? Math.round((val / total) * 100) : 0
  const preAvg  = avg(preScores)
  const postAvg = avg(postScores)
  const improvement = preScores.length && postScores.length
    ? (parseFloat(postAvg) - parseFloat(preAvg)).toFixed(2) : '—'
  const wouldRecommend = (postOnlyRatings['po3'] || 0) >= 4
  const aiAvg  = avg(['ai1','ai2','ai3'].map(id => postRatings[id] || 0).filter(v => v > 0))
  const trAvg  = avg(['tr1','tr2','tr3'].map(id => postRatings[id] || 0).filter(v => v > 0))
  return { preAvg, postAvg, improvement, wouldRecommend, aiAvg, trAvg }
}

// Steps: intro → pre → post → postonly → review  (open removed)
const STEPS = ['intro', 'pre', 'post', 'postonly', 'review']

function FeedbackForm({ onSuccess }) {
  const [step, setStep]               = useState(0)
  const [workshopName, setWorkshopName]       = useState('')
  const [participantName, setParticipantName] = useState('')
  const [gradeLevel, setGradeLevel]   = useState('')
  const [preRatings,  setPreRatings]  = useState({})
  const [postRatings, setPostRatings] = useState({})
  const [postOnlyRatings, setPostOnlyRatings] = useState({})
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  const currentStep = STEPS[step]
  const setPreVal  = (id, v) => setPreRatings(r  => ({ ...r, [id]: v }))
  const setPostVal = (id, v) => setPostRatings(r => ({ ...r, [id]: v }))
  const setPoVal   = (id, v) => setPostOnlyRatings(r => ({ ...r, [id]: v }))

  const unansweredCount = () => {
    if (currentStep === 'pre')     return ALL_PRE_POST_IDS.filter(id => !preRatings[id]).length
    if (currentStep === 'post')    return ALL_PRE_POST_IDS.filter(id => !postRatings[id]).length
    if (currentStep === 'postonly') return POST_ONLY_QUESTIONS.filter(q => !postOnlyRatings[q.id]).length
    return 0
  }

  const canAdvance = () => {
    if (currentStep === 'intro')    return gradeLevel !== ''
    if (currentStep === 'pre')      return ALL_PRE_POST_IDS.every(id => preRatings[id] > 0)
    if (currentStep === 'post')     return ALL_PRE_POST_IDS.every(id => postRatings[id] > 0)
    if (currentStep === 'postonly') return POST_ONLY_QUESTIONS.every(q => postOnlyRatings[q.id] > 0)
    return true
  }

  const handleNext = () => {
    setError('')
    if (!canAdvance()) { setError(`Please answer all questions before continuing. (${unansweredCount()} remaining)`); return }
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setSubmitting(true); setError('')
    try {
      const metrics = computeMetrics(preRatings, postRatings, postOnlyRatings)
      const { ok } = await submitFeedback({
        workshopName:    workshopName || null,
        participantName: participantName || null,
        gradeLevel,
        reflection: JSON.stringify({ pre: preRatings, post: postRatings, postOnly: postOnlyRatings, metrics }),
        beforeRating: Math.round(ALL_PRE_POST_IDS.map(id => preRatings[id]  || 0).reduce((a,b)=>a+b,0) / ALL_PRE_POST_IDS.length),
        afterRating:  Math.round(ALL_PRE_POST_IDS.map(id => postRatings[id] || 0).reduce((a,b)=>a+b,0) / ALL_PRE_POST_IDS.length),
      })
      if (ok) {
        await incrementStat('students_reached')
        onSuccess({ gradeLevel, workshopName, preRatings, postRatings, postOnlyRatings, metrics })
      } else {
        setError('Submission failed — please try again.')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally { setSubmitting(false) }
  }

  // ── intro ──────────────────────────────────────────────────────────────────
  if (currentStep === 'intro') return (
    <div className="space-y-5">
      <div className="glass p-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5">
        <p className="text-sm text-white/70 leading-relaxed">
          This survey takes about <strong className="text-white">2–3 minutes</strong> and has
          three parts: the same 12 questions answered <strong className="text-red-400">before</strong> and{' '}
          <strong className="text-teal-400">after</strong> the workshop, plus 3 quick reflection
          ratings. Your responses directly power the Gold Award impact report.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">Workshop / Event Name</label>
          <input value={workshopName} onChange={e => setWorkshopName(e.target.value)}
            placeholder="e.g. Lincoln Middle — AI Workshop" className="input-field" />
        </div>
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">
            Your Name <span className="text-white/30">(optional)</span>
          </label>
          <input value={participantName} onChange={e => setParticipantName(e.target.value)}
            placeholder="Anonymous is fine" className="input-field" />
        </div>
      </div>
      <div>
        <label className="font-mono text-xs text-white/50 mb-1 block">
          Grade Level / Role <span className="text-cyan-400">*</span>
        </label>
        <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className="input-field" required>
          <option value="" disabled>Select your grade or role…</option>
          {GRADE_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
      <button onClick={handleNext} className="btn-cyber w-full flex items-center justify-center gap-2">
        Start Survey → <span className="font-mono text-xs opacity-60">Step 1 of 3</span>
      </button>
    </div>
  )

  // ── pre ────────────────────────────────────────────────────────────────────
  if (currentStep === 'pre') return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-red-400/10 border border-red-400/30">
        <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-300">BEFORE the Workshop</p>
          <p className="text-xs text-white/50">Rate each statement: 1 = Strongly Disagree → 5 = Strongly Agree</p>
        </div>
        <span className="ml-auto font-mono text-xs text-white/30">Step 1 of 3</span>
      </div>
      {SECTIONS.map(s => (
        <SectionBlock key={s.id} section={s} preValues={preRatings} postValues={postRatings}
          onChangeP={setPreVal} onChangeQ={setPostVal} phase="before" />
      ))}
      {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
      <div className="flex gap-3">
        <button onClick={() => setStep(s => s - 1)} className="btn-outline flex-shrink-0">← Back</button>
        <button onClick={handleNext} className="btn-cyber flex-1 flex items-center justify-center gap-2">
          Next: After Workshop →
        </button>
      </div>
    </div>
  )

  // ── post ───────────────────────────────────────────────────────────────────
  if (currentStep === 'post') return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-400/10 border border-teal-400/30">
        <div className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-teal-300">AFTER the Workshop</p>
          <p className="text-xs text-white/50">Answer the same questions again — now that you've attended</p>
        </div>
        <span className="ml-auto font-mono text-xs text-white/30">Step 2 of 3</span>
      </div>
      {SECTIONS.map(s => (
        <SectionBlock key={s.id} section={s} preValues={preRatings} postValues={postRatings}
          onChangeP={setPreVal} onChangeQ={setPostVal} phase="after" />
      ))}
      {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
      <div className="flex gap-3">
        <button onClick={() => setStep(s => s - 1)} className="btn-outline flex-shrink-0">← Back</button>
        <button onClick={handleNext} className="btn-cyber flex-1 flex items-center justify-center gap-2">
          Next: Workshop Reflection →
        </button>
      </div>
    </div>
  )

  // ── postonly ───────────────────────────────────────────────────────────────
  if (currentStep === 'postonly') return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-400/10 border border-violet-400/30">
        <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-violet-300">Workshop Reflection</p>
          <p className="text-xs text-white/50">3 final rating questions about today's session</p>
        </div>
        <span className="ml-auto font-mono text-xs text-white/30">Step 3 of 3</span>
      </div>
      <div className="glass rounded-xl border border-violet-400/30 p-4">
        {POST_ONLY_QUESTIONS.map(q => (
          <LikertRow key={q.id} questionId={q.id} text={q.text}
            value={postOnlyRatings[q.id] || 0} onChange={setPoVal} phase="after" />
        ))}
      </div>
      {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
      <div className="flex gap-3">
        <button onClick={() => setStep(s => s - 1)} className="btn-outline flex-shrink-0">← Back</button>
        <button onClick={handleNext} className="btn-cyber flex-1 flex items-center justify-center gap-2">
          Review & Submit →
        </button>
      </div>
    </div>
  )

  // ── review ─────────────────────────────────────────────────────────────────
  if (currentStep === 'review') {
    const metrics = computeMetrics(preRatings, postRatings, postOnlyRatings)
    const imp = parseFloat(metrics.improvement)
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-green-400/10 border border-green-400/30">
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-green-300">Review &amp; Submit</p>
        </div>
        <div className="glass p-5 rounded-xl border border-white/10 space-y-3">
          <p className="font-display text-xs tracking-widest text-white/40 uppercase mb-3">Your Impact Preview</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass p-3 rounded-lg border border-red-400/20 text-center">
              <div className="font-display text-2xl font-black text-red-400">{metrics.preAvg}</div>
              <div className="text-xs text-white/40 mt-1">Avg score BEFORE</div>
            </div>
            <div className="glass p-3 rounded-lg border border-teal-400/20 text-center">
              <div className="font-display text-2xl font-black text-teal-400">{metrics.postAvg}</div>
              <div className="text-xs text-white/40 mt-1">Avg score AFTER</div>
            </div>
          </div>
          {imp > 0 && (
            <div className="flex items-center justify-center gap-2 py-2">
              <TrendingUp size={16} className="text-teal-400" />
              <span className="text-teal-400 font-display font-bold">+{metrics.improvement} point improvement out of 5</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 text-xs text-white/60 mt-2">
            <div className="flex justify-between">
              <span>Would recommend workshop</span>
              <span className={metrics.wouldRecommend ? 'text-green-400 font-mono' : 'text-white/30 font-mono'}>
                {metrics.wouldRecommend ? 'Yes ✓' : 'No'}
              </span>
            </div>
          </div>
        </div>
        <div className="glass p-3 rounded-xl border border-white/10 text-xs text-white/50 space-y-1">
          <div className="flex justify-between"><span>Grade Level</span><span className="text-white/80">{gradeLevel}</span></div>
          {workshopName && <div className="flex justify-between"><span>Workshop</span><span className="text-white/80">{workshopName}</span></div>}
        </div>
        {error && (
          <div className="glass p-3 rounded-xl border border-red-400/30 bg-red-400/5">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setStep(s => s - 1)} className="btn-outline flex-shrink-0">← Back</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="btn-cyber flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
            {submitting
              ? <><RefreshCw size={16} className="animate-spin" /> Submitting…</>
              : <><Send size={16} /> Submit Feedback</>}
          </button>
        </div>
        <p className="text-center text-xs text-white/25 font-mono">
          Responses are anonymous by default. Submission increments the Students Reached counter.
        </p>
      </div>
    )
  }

  return null
}

function SuccessCard({ submission, onAnother }) {
  const { metrics, gradeLevel, workshopName } = submission
  const imp = parseFloat(metrics?.improvement || 0)
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-teal-400/10 border border-teal-400/30 flex items-center justify-center mx-auto mb-5">
        <CheckCircle size={32} className="text-teal-400" />
      </div>
      <h3 className="font-display text-2xl font-bold mb-2">Thank you!</h3>
      <p className="text-white/60 text-sm mb-6">
        Your survey has been recorded. The Students Reached counter has been updated.
      </p>
      <div className="glass p-5 rounded-2xl border border-teal-400/20 text-left mb-6 space-y-3 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={14} className="text-teal-400" />
          <span className="font-mono text-xs text-teal-400 tracking-wide">YOUR IMPACT DATA</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-3 rounded-lg border border-red-400/20 text-center">
            <div className="font-display text-2xl font-black text-red-400">{metrics?.preAvg}</div>
            <div className="text-xs text-white/40 mt-0.5">Before avg / 5</div>
          </div>
          <div className="glass p-3 rounded-lg border border-teal-400/20 text-center">
            <div className="font-display text-2xl font-black text-teal-400">{metrics?.postAvg}</div>
            <div className="text-xs text-white/40 mt-0.5">After avg / 5</div>
          </div>
        </div>
        {imp > 0 && (
          <div className="flex items-center justify-center gap-2 py-1">
            <TrendingUp size={14} className="text-teal-400" />
            <span className="text-teal-400 font-mono text-sm font-bold">+{metrics.improvement} point improvement</span>
          </div>
        )}
        <div className="text-xs text-white/40 space-y-1.5 border-t border-white/10 pt-3">
          <div className="flex justify-between">
            <span>Would recommend</span>
            <span className={metrics?.wouldRecommend ? 'text-green-400' : 'text-white/30'}>
              {metrics?.wouldRecommend ? 'Yes' : 'No'}
            </span>
          </div>
          {gradeLevel && <div className="flex justify-between"><span>Grade level</span><span className="text-white/60">{gradeLevel}</span></div>}
          {workshopName && <div className="flex justify-between"><span>Workshop</span><span className="text-white/60 truncate max-w-[160px]">{workshopName}</span></div>}
        </div>
      </div>
      <button onClick={onAnother} className="btn-outline flex items-center gap-2 mx-auto">
        Submit Another Response
      </button>
    </div>
  )
}

function RecentFeed({ feed, loading }) {
  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="glass p-4 rounded-xl border border-white/10 animate-pulse">
          <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
  if (!feed.length) return (
    <div className="glass p-8 rounded-xl border border-white/10 text-center text-white/30">
      <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">No responses yet — be the first!</p>
    </div>
  )
  return (
    <div className="space-y-3">
      {feed.map((item, i) => {
        const diff = item.after_rating - item.before_rating
        const diffColor = diff > 0 ? 'text-teal-400' : diff < 0 ? 'text-red-400' : 'text-white/40'
        let metrics = null
        try { if (item.comment) { const p = JSON.parse(item.comment); if (p.metrics) metrics = p.metrics } } catch {}
        return (
          <div key={item.id ?? item._local_id ?? i}
            className="glass p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="font-mono text-xs text-cyan-400 border border-cyan-400/20 bg-cyan-400/5 px-2 py-0.5 rounded-full">
                  {item.grade_level}
                </span>
                {item.workshop_name && (
                  <span className="font-mono text-xs text-white/30 truncate max-w-[120px]">{item.workshop_name}</span>
                )}
              </div>
              <span className={`font-display font-bold text-sm flex-shrink-0 ${diffColor}`}>
                {diff > 0 ? `+${diff} ↑` : diff < 0 ? `${diff} ↓` : '='}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/40">
              <span className="text-red-400 font-mono">{'★'.repeat(item.before_rating || 0)}</span>
              <span className="text-white/20">→</span>
              <span className="text-teal-400 font-mono">{'★'.repeat(item.after_rating || 0)}</span>
            </div>
            {metrics && (
              <div className="flex gap-3 text-xs font-mono mb-1">
                <span className="text-white/35">avg {metrics.preAvg}→{metrics.postAvg}</span>
                {parseFloat(metrics.improvement) > 0 && <span className="text-teal-400">+{metrics.improvement} pts</span>}
                {metrics.wouldRecommend && <span className="text-green-400">✓ recommends</span>}
              </div>
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

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1234'

function AdminPanel({ currentCount, onCountUpdated }) {
  const [open, setOpen]           = useState(false)
  const [pin, setPin]             = useState('')
  const [showPin, setShowPin]     = useState(false)
  const [unlocked, setUnlocked]   = useState(false)
  const [pinError, setPinError]   = useState('')
  const [editKey, setEditKey]     = useState('students_reached')
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState('')

  const STAT_OPTIONS = [
    { key: 'students_reached',    label: 'Students Reached' },
    { key: 'workshops_conducted', label: 'Workshops Conducted' },
    { key: 'community_partners',  label: 'Community Partners' },
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
      <button onClick={() => setOpen(o => !o)}
        className="w-full p-5 flex items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <Lock size={16} className="text-violet-400" />
          <span className="font-display text-sm tracking-wide text-violet-400">Admin Panel</span>
          <span className="font-mono text-xs text-white/30 border border-white/10 px-2 py-0.5 rounded-full">PIN protected</span>
        </div>
        <ChevronDown size={16} className={`text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-white/10 p-5">
          {!unlocked ? (
            <div className="space-y-3 max-w-xs">
              <p className="text-white/50 text-sm">Enter your admin PIN to edit the counters manually.</p>
              <div className="relative">
                <input type={showPin ? 'text' : 'password'} value={pin}
                  onChange={e => { setPin(e.target.value); setPinError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  placeholder="Enter PIN" maxLength={8}
                  className="input-field pr-10 tracking-widest font-mono" />
                <button type="button" onClick={() => setShowPin(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {pinError && <p className="text-red-400 text-xs font-mono">{pinError}</p>}
              <button onClick={handleUnlock} className="btn-violet w-full text-xs py-2">Unlock</button>
              <p className="text-white/20 text-xs font-mono">Set VITE_ADMIN_PIN in .env to change the default PIN (1234).</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-teal-400" />
                <span className="text-teal-400 font-mono text-xs">Admin unlocked</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-mono text-xs text-white/50 mb-1 block">Stat to edit</label>
                  <select value={editKey} onChange={e => setEditKey(e.target.value)} className="input-field">
                    {STAT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-xs text-white/50 mb-1 block">New value</label>
                  <input type="number" min="0" value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder={`Current: ${currentCount.toLocaleString()}`}
                    className="input-field" />
                </div>
                <div className="flex items-end">
                  <button onClick={handleSave} disabled={saving || !editValue}
                    className="btn-violet w-full text-xs py-3 disabled:opacity-40">
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

const STEP_LABELS = ['Info', 'Before', 'After', 'Reflection', 'Review']

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className={`flex-1 h-1 rounded-full transition-all duration-300
            ${i < step ? 'bg-teal-400' : i === step ? 'bg-cyan-400' : 'bg-white/10'}`} />
        </div>
      ))}
    </div>
  )
}

function LiveCounter({ count, loading }) {
  return (
    <div className="glass p-6 rounded-2xl border border-cyan-400/20 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Users size={16} className="text-cyan-400" />
        <span className="font-mono text-xs text-cyan-400 tracking-widest">STUDENTS REACHED</span>
        {loading && <RefreshCw size={12} className="text-white/30 animate-spin" />}
      </div>
      <div className="font-display text-5xl font-black cyber-text">
        {count.toLocaleString()}<span className="text-3xl">+</span>
      </div>
      <p className="text-white/40 text-xs mt-2">
        {isConfigured ? 'Live from Supabase' : 'Local count (configure Supabase for cloud sync)'}
      </p>
    </div>
  )
}

export default function EventFeedback() {
  const [studentsCount,  setStudentsCount]  = useState(SEED_COUNT)
  const [statsLoading,   setStatsLoading]   = useState(true)
  const [feed,           setFeed]           = useState([])
  const [feedLoading,    setFeedLoading]    = useState(true)
  const [submitted,      setSubmitted]      = useState(false)
  const [lastSubmission, setLastSubmission] = useState(null)
  const [formStep,       setFormStep]       = useState(0)

  const loadData = useCallback(async () => {
    setStatsLoading(true); setFeedLoading(true)
    try {
      const [stats, recent] = await Promise.all([fetchSiteStats(), fetchRecentFeedback(8)])
      if (stats?.students_reached != null) setStudentsCount(stats.students_reached)
      setFeed(recent || [])
    } catch (e) { console.warn('loadData error', e) }
    finally { setStatsLoading(false); setFeedLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSuccess = (submission) => {
    setLastSubmission(submission)
    setSubmitted(true)
    setStudentsCount(c => c + 1)
    setFeed(f => [{
      _local_id:     Date.now(),
      grade_level:   submission.gradeLevel,
      workshop_name: submission.workshopName || null,
      before_rating: Math.round(parseFloat(submission.metrics?.preAvg  || 1)),
      after_rating:  Math.round(parseFloat(submission.metrics?.postAvg || 1)),
      comment:       JSON.stringify({ metrics: submission.metrics }),
      created_at:    new Date().toISOString(),
    }, ...f].slice(0, 8))
  }

  const handleAnother = () => { setSubmitted(false); setLastSubmission(null); setFormStep(0) }
  const handleAdminCountUpdated = (key, value) => {
    if (key === 'students_reached') setStudentsCount(value)
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          tag="Event Feedback"
          title="Workshop Impact"
          highlight="Survey"
          subtitle="A structured pre & post survey that measures how your knowledge, confidence, and interest in AI and cybersecurity changed — your responses directly power the Gold Award impact report."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <LiveCounter count={studentsCount} loading={statsLoading} />
          <div className="md:col-span-2 glass p-5 rounded-2xl border border-white/10 flex flex-col justify-center gap-2">
            <h3 className="font-display text-base font-bold">What this survey measures</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Brain,         color: 'text-cyan-400',   label: '3 AI Knowledge questions' },
                { icon: Shield,        color: 'text-violet-400', label: '3 Cybersecurity questions' },
                { icon: TrafficCone,   color: 'text-teal-400',   label: '3 Smart Cities questions' },
                { icon: MessageSquare, color: 'text-white/50',   label: '3 Workshop reflection Qs' },
                { icon: TrendingUp,    color: 'text-green-400',  label: 'Auto-calculated impact metrics' },
              ].map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-white/55">
                  <Icon size={12} className={color} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
          <div className="lg:col-span-3">
            <GlassCard hover={false} color="cyber">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare size={18} className="text-cyan-400" />
                <h2 className="font-display text-xl font-bold">Submit Your Feedback</h2>
              </div>
              <StepBar step={formStep} />
              {submitted && lastSubmission
                ? <SuccessCard submission={lastSubmission} onAnother={handleAnother} />
                : <FeedbackForm onSuccess={handleSuccess} />
              }
            </GlassCard>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm tracking-wide text-white/70">Recent Responses</h3>
              <button onClick={loadData}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-cyan-400 transition-colors font-mono">
                <RefreshCw size={12} /> refresh
              </button>
            </div>
            <RecentFeed feed={feed} loading={feedLoading} />
          </div>
        </div>

        <AdminPanel currentCount={studentsCount} onCountUpdated={handleAdminCountUpdated} />
      </div>
    </div>
  )
}