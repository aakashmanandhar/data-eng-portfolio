import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Lock, Check, Flame, Trophy, TrendingUp, TrendingDown, Loader2, LogOut,
  Dumbbell, Moon, HeartPulse, UtensilsCrossed, Timer, Languages, Cpu,
  Database, Zap, Activity, Scale, Save,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts'
import '../App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const TOKEN_KEY = 'todo_token'

function blockIcon(name) {
  const n = name.toLowerCase()
  if (n.includes('stretch') || n.includes('mobility')) return Activity
  if (n.includes('rest')) return Moon
  if (n.includes('physio')) return HeartPulse
  if (n.includes('gym')) return Dumbbell
  if (n.includes('data engineering')) return Database
  if (n.includes('artificial intelligence')) return Cpu
  if (n.includes('fabric')) return Zap
  if (n.includes('german')) return Languages
  if (n.includes('meal')) return UtensilsCrossed
  if (n.includes('fasting')) return Timer
  return Check
}

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Todo-Token': token, ...(options.headers || {}) },
  })
  if (res.status === 401 || res.status === 403) throw new Error('unauthorized')
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json()
}

function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password || checking) return
    setChecking(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/todolist/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: password }),
      })
      const data = await res.json()
      if (data.ok) {
        localStorage.setItem(TOKEN_KEY, password)
        onUnlock(password)
      } else {
        setError(data.error || 'Incorrect password')
      }
    } catch {
      setError('Could not reach the server')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="todo-gate-wrap">
      <form className="todo-gate-card" onSubmit={submit}>
        <Lock size={22} className="todo-gate-icon" />
        <h2>Private</h2>
        <p>This page is just for Aakash.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="todo-gate-input"
        />
        {error && <span className="todo-gate-error">{error}</span>}
        <button type="submit" className="todo-gate-btn" disabled={checking}>
          {checking ? <Loader2 size={14} className="cv-download-spinner" /> : 'Unlock'}
        </button>
      </form>
    </div>
  )
}

function KpiTile({ icon, label, value, sublabel }) {
  return (
    <div className="todo-kpi-tile">
      <span className="todo-kpi-icon">{icon}</span>
      <span className="todo-kpi-value">{value}</span>
      <span className="todo-kpi-label">{label}</span>
      {sublabel && <span className="todo-kpi-sublabel">{sublabel}</span>}
    </div>
  )
}

function BodySilhouette({ bmi, label, color }) {
  const scale = bmi ? Math.min(1.4, Math.max(0.75, bmi / 25)) : 1
  return (
    <div className="todo-body-silhouette">
      <svg viewBox="0 0 100 200" width="84" height="150">
        <g style={{ transform: `scaleX(${scale})`, transformOrigin: '50px 100px', transition: 'transform 0.4s ease' }}>
          <circle cx="50" cy="28" r="20" fill={color} opacity="0.85" />
          <rect x="30" y="50" width="40" height="80" rx="18" fill={color} opacity="0.85" />
          <rect x="22" y="130" width="16" height="60" rx="8" fill={color} opacity="0.85" />
          <rect x="62" y="130" width="16" height="60" rx="8" fill={color} opacity="0.85" />
        </g>
      </svg>
      <div className="todo-body-silhouette-label">{label}</div>
      {bmi != null && <div className="todo-body-silhouette-bmi">BMI {bmi}</div>}
    </div>
  )
}

function TodoListPage() {
  const [token, setToken] = useState(null)
  const [today, setToday] = useState(null)
  const [summary, setSummary] = useState(null)
  const [health, setHealth] = useState(null)
  const [projection, setProjection] = useState(null)
  const [weeklyReview, setWeeklyReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [nutritionForm, setNutritionForm] = useState({ weight_kg: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', sleep_score: '' })
  const [savingNutrition, setSavingNutrition] = useState(false)

  const load = useCallback((t) => {
    setLoading(true)
    setError(false)
    Promise.all([
      apiFetch('/todolist/today/', t),
      apiFetch('/todolist/summary/', t),
      apiFetch('/todolist/health-summary/', t),
      apiFetch('/todolist/projection/', t),
      apiFetch('/todolist/weekly-review/', t),
    ])
      .then(([todayData, summaryData, healthData, projectionData, weeklyReviewData]) => {
        setToday(todayData)
        setSummary(summaryData)
        setHealth(healthData)
        setProjection(projectionData)
        setWeeklyReview(weeklyReviewData)
        setNutritionForm({
          weight_kg: healthData.today.weight_kg ?? '',
          calories: healthData.today.calories ?? '',
          protein_g: healthData.today.protein_g ?? '',
          carbs_g: healthData.today.carbs_g ?? '',
          fat_g: healthData.today.fat_g ?? '',
          sleep_score: healthData.today.sleep_score ?? '',
        })
      })
      .catch((err) => {
        if (err.message === 'unauthorized') {
          localStorage.removeItem(TOKEN_KEY)
          setToken(null)
        } else {
          setError(true)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved) {
      setToken(saved)
      load(saved)
    } else {
      setLoading(false)
    }
  }, [load])

  const handleUnlock = (t) => {
    setToken(t)
    load(t)
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setToday(null)
    setSummary(null)
    setHealth(null)
    setProjection(null)
    setWeeklyReview(null)
  }

  const handleNutritionChange = (field, value) => {
    setNutritionForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveNutrition = async (e) => {
    e.preventDefault()
    if (savingNutrition) return
    setSavingNutrition(true)
    try {
      await apiFetch('/todolist/nutrition/', token, { method: 'POST', body: JSON.stringify(nutritionForm) })
      load(token)
    } catch {
      load(token)
    } finally {
      setSavingNutrition(false)
    }
  }

  const toggleBlock = async (id) => {
    setToday((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, completed: !b.completed } : b)),
    }))
    try {
      await apiFetch('/todolist/toggle/', token, { method: 'POST', body: JSON.stringify({ id }) })
      load(token)
    } catch {
      load(token)
    }
  }

  if (!token) return <PasswordGate onUnlock={handleUnlock} />

  if (loading && !today) {
    return (
      <div className="detail-page todo-page">
        <div className="layer-pending">
          <span className="layer-pending-icon">✅</span>
          <div className="layer-pending-title">Loading your day…</div>
        </div>
      </div>
    )
  }

  const todayDone = today ? today.blocks.filter((b) => b.completed).length : 0
  const todayTotal = today ? today.blocks.length : 0
  const todayPct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0

  return (
    <div className="detail-page todo-page">
      <div className="cv-page-top-row">
        <Link to="/" className="back-link">← Back to portfolio</Link>
        <button className="todo-logout-btn" onClick={handleLogout}>
          <LogOut size={14} /> Lock
        </button>
      </div>

      <div className="todo-header-row">
        <div>
          <h1>Daily Discipline Tracker</h1>
          <p className="todo-subtitle">{today?.date} · {todayDone}/{todayTotal} blocks done today</p>
        </div>
        <div className="todo-today-ring" style={{ background: `conic-gradient(var(--accent1) ${todayPct * 3.6}deg, var(--border) 0deg)` }}>
          <span>{todayPct}%</span>
        </div>
      </div>

      {error && <p className="todo-gate-error" style={{ marginBottom: 14 }}>Couldn't refresh the latest data — showing the last loaded view.</p>}

      {summary && (
        <>
          <div className="todo-kpi-row">
            <KpiTile icon={<Flame size={18} />} label="Current streak" value={`${summary.current_streak}d`} sublabel="all blocks, back to back" />
            <KpiTile icon={<Trophy size={18} />} label="Longest streak" value={`${summary.longest_streak}d`} sublabel="personal best" />
            <KpiTile icon={<TrendingUp size={18} />} label="Overall consistency" value={`${summary.overall_rate}%`} sublabel="since tracking began" />
            <KpiTile icon={<Check size={18} />} label="This week" value={`${summary.week.filter((d) => d.rate !== null).reduce((a, d) => a + d.completed, 0)}/${summary.week.filter((d) => d.rate !== null).reduce((a, d) => a + d.total, 0)}`} sublabel="blocks completed" />
          </div>

          <div className="todo-week-grid">
            {summary.week.map((d) => (
              <div key={d.date} className="todo-week-cell">
                <span className="todo-week-day">{d.day}</span>
                <div
                  className="todo-week-ring"
                  style={{
                    background: d.rate === null
                      ? 'var(--border)'
                      : `conic-gradient(var(--accent1) ${d.rate * 3.6}deg, var(--border) 0deg)`,
                  }}
                >
                  <span>{d.rate === null ? '—' : `${Math.round(d.rate)}%`}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {today?.is_rest_day && (
        <div className="todo-rest-day">
          <Moon size={22} />
          <div>
            <div className="todo-rest-day-title">Rest day</div>
            <div className="todo-rest-day-sub">Saturday — nothing scheduled. Recover.</div>
          </div>
        </div>
      )}

      <div className="todo-checklist">
        {today?.blocks.map((b) => {
          const Icon = blockIcon(b.name)
          return (
            <button
              key={b.id}
              className={`todo-item ${b.completed ? 'todo-item-done' : ''}`}
              style={{ borderLeftColor: b.color }}
              onClick={() => toggleBlock(b.id)}
            >
              <span className="todo-item-icon" style={{ color: b.color }}>
                <Icon size={16} />
              </span>
              <span className={`todo-check ${b.completed ? 'todo-check-done' : ''}`} style={{ background: b.completed ? b.color : 'transparent', borderColor: b.color }}>
                {b.completed && <Check size={12} color="#fff" strokeWidth={3} />}
              </span>
              <span className="todo-item-body">
                <span className="todo-item-name">{b.name}</span>
                <span className="todo-item-time">{b.start_time} – {b.end_time}</span>
              </span>
            </button>
          )
        })}
      </div>

      {summary && (
        <div className="todo-charts-grid">
          <div className="todo-chart-card">
            <div className="todo-chart-head">
              <span className="todo-chart-title">12-week consistency trend</span>
              <span className="todo-chart-badge">{summary.trend[summary.trend.length - 1]?.rate ?? 0}%</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={summary.trend}>
                <defs>
                  <linearGradient id="consistencyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} unit="%" width={36} />
                <Tooltip contentStyle={{ fontSize: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="rate" stroke="var(--accent1)" strokeWidth={2.5} fill="url(#consistencyFill)" name="Consistency %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="todo-chart-card">
            <div className="todo-chart-head">
              <span className="todo-chart-title">Completion rate by area</span>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(230, (summary.per_block?.length || 8) * 30)}>
              <BarChart data={summary.per_block} layout="vertical" margin={{ left: 10, right: 16, top: 4, bottom: 4 }} barCategoryGap={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} unit="%" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 10, fill: 'var(--text)' }}
                  tickFormatter={(v) => (v.length > 19 ? `${v.slice(0, 17)}…` : v)}
                />
                <Tooltip contentStyle={{ fontSize: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={14}>
                  {summary.per_block.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <h2 className="todo-section-title">Nutrition &amp; Body</h2>

      <form className="todo-nutrition-form" onSubmit={handleSaveNutrition}>
        <div className="todo-nutrition-head">
          <span className="todo-nutrition-head-title">Log today's intake</span>
          <span className="todo-nutrition-head-hint">Enter once a day — weight, meals, macros and sleep</span>
        </div>
        <div className="todo-nutrition-grid">
          <label className="todo-field">
            <span>Weight (kg)</span>
            <input type="number" step="0.1" value={nutritionForm.weight_kg} onChange={(e) => handleNutritionChange('weight_kg', e.target.value)} placeholder="86.0" />
          </label>
          <label className="todo-field">
            <span>Calories</span>
            <input type="number" value={nutritionForm.calories} onChange={(e) => handleNutritionChange('calories', e.target.value)} placeholder="1800" />
          </label>
          <label className="todo-field">
            <span>Protein (g)</span>
            <input type="number" value={nutritionForm.protein_g} onChange={(e) => handleNutritionChange('protein_g', e.target.value)} placeholder="160" />
          </label>
          <label className="todo-field">
            <span>Carbs (g)</span>
            <input type="number" value={nutritionForm.carbs_g} onChange={(e) => handleNutritionChange('carbs_g', e.target.value)} placeholder="150" />
          </label>
          <label className="todo-field">
            <span>Fat (g)</span>
            <input type="number" value={nutritionForm.fat_g} onChange={(e) => handleNutritionChange('fat_g', e.target.value)} placeholder="40" />
          </label>
          <label className="todo-field">
            <span>Sleep score</span>
            <input type="number" step="0.1" value={nutritionForm.sleep_score} onChange={(e) => handleNutritionChange('sleep_score', e.target.value)} placeholder="82" />
          </label>
        </div>
        <div className="todo-nutrition-actions">
          <button type="submit" className="todo-nutrition-save" disabled={savingNutrition}>
            {savingNutrition ? <Loader2 size={14} className="cv-download-spinner" /> : <Save size={14} />}
            {savingNutrition ? 'Saving…' : "Save today's log"}
          </button>
        </div>
      </form>

      {health && (
        <>
          <div className="todo-kpi-row todo-kpi-row-5">
            <KpiTile icon={<Scale size={18} />} label="BMI" value={health.bmi ?? '—'} sublabel={health.bmi_category || 'log your weight above'} />
            <KpiTile icon={<Activity size={18} />} label="Est. TDEE" value={health.estimated_tdee ? `${health.estimated_tdee}` : '—'} sublabel="estimated maintenance kcal/day" />
            <KpiTile
              icon={health.today.calories && health.estimated_tdee && health.today.calories <= health.estimated_tdee ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
              label="Today vs TDEE"
              value={health.today.calories && health.estimated_tdee ? `${health.estimated_tdee - health.today.calories > 0 ? '-' : '+'}${Math.abs(health.estimated_tdee - health.today.calories)}` : '—'}
              sublabel="kcal deficit (-) or surplus (+)"
            />
            <KpiTile icon={<Flame size={18} />} label="Est. weekly fat loss" value={health.estimated_weekly_fat_loss_kg != null ? `${health.estimated_weekly_fat_loss_kg} kg` : '—'} sublabel="from last 7 logged days" />
            <KpiTile icon={<Moon size={18} />} label="Sleep score" value={health.today.sleep_score ?? '—'} sublabel="logged for today" />
          </div>

          <div className="todo-charts-grid">
            <div className="todo-chart-card">
              <div className="todo-chart-head">
                <span className="todo-chart-title">Weight trend (14 days)</span>
                {health.latest_weight != null && <span className="todo-chart-badge">{health.latest_weight} kg</span>}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={health.weight_trend}>
                  <defs>
                    <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent2)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: 'var(--muted)' }} unit="kg" width={40} />
                  <Tooltip contentStyle={{ fontSize: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="weight" stroke="var(--accent2)" strokeWidth={2.5} fill="url(#weightFill)" name="Weight (kg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="todo-chart-card">
              <div className="todo-chart-head">
                <span className="todo-chart-title">Calorie deficit vs TDEE (14 days)</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={health.calorie_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} width={40} />
                  <Tooltip contentStyle={{ fontSize: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="deficit" radius={[4, 4, 0, 0]} name="Deficit (kcal)">
                    {health.calorie_trend.map((entry, i) => (
                      <Cell key={i} fill={entry.deficit >= 0 ? 'var(--green)' : '#D14545'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="todo-chart-card todo-chart-card-wide">
              <div className="todo-chart-head">
                <span className="todo-chart-title">Sleep score (14 days)</span>
                {health.today.sleep_score != null && <span className="todo-chart-badge">{health.today.sleep_score}</span>}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={health.sleep_trend}>
                  <defs>
                    <linearGradient id="sleepFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6A4C93" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6A4C93" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} width={32} />
                  <Tooltip contentStyle={{ fontSize: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="sleep_score" stroke="#6A4C93" strokeWidth={2.5} fill="url(#sleepFill)" name="Sleep score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <h2 className="todo-section-title">Projected Progress</h2>

      {projection && !projection.has_enough_data && (
        <div className="todo-rest-day">
          <TrendingUp size={22} />
          <div>
            <div className="todo-rest-day-title">Not enough data yet</div>
            <div className="todo-rest-day-sub">Log nutrition for at least 3 days ({projection.days_logged}/3 so far) to unlock your 12-week projection.</div>
          </div>
        </div>
      )}

      {projection && projection.has_enough_data && (
        <>
          <div className="todo-kpi-row">
            <KpiTile
              icon={<TrendingDown size={18} />}
              label="Pace"
              value={`${projection.weekly_rate_kg > 0 ? '-' : '+'}${Math.abs(projection.weekly_rate_kg)} kg/wk`}
              sublabel="from your logged deficit"
            />
            <KpiTile
              icon={<Scale size={18} />}
              label="In 12 weeks"
              value={`${projection.projection[projection.projection.length - 1]?.weight} kg`}
              sublabel={projection.projected_bmi_category}
            />
            <KpiTile icon={<Activity size={18} />} label="Avg daily deficit" value={`${projection.avg_daily_deficit} kcal`} sublabel="last logged days" />
          </div>

          <div className="todo-projection-row">
            <div className="todo-chart-card todo-projection-chart">
              <div className="todo-chart-head">
                <span className="todo-chart-title">Projected weight (12 weeks)</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={projection.projection}>
                  <defs>
                    <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(w) => `wk ${w}`} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: 'var(--muted)' }} unit="kg" width={40} />
                  <Tooltip contentStyle={{ fontSize: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="weight" stroke="var(--accent1)" strokeWidth={2.5} fill="url(#projectionFill)" name="Projected weight" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="todo-silhouette-card">
              <BodySilhouette bmi={projection.starting_bmi} label="Today" color="var(--muted)" />
              <BodySilhouette bmi={projection.projection[projection.projection.length - 1]?.bmi} label="In 12 weeks" color="var(--accent1)" />
            </div>
          </div>
        </>
      )}

      <h2 className="todo-section-title">Weekly Review</h2>

      {weeklyReview && (
        <>
          <div className="todo-kpi-row">
            <KpiTile icon={<TrendingUp size={18} />} label="Consistency" value={weeklyReview.current_week.consistency_rate != null ? `${weeklyReview.current_week.consistency_rate}%` : '—'} sublabel="this week" />
            <KpiTile icon={<UtensilsCrossed size={18} />} label="Avg protein" value={weeklyReview.current_week.avg_protein_g != null ? `${weeklyReview.current_week.avg_protein_g}g` : '—'} sublabel="per logged day" />
            <KpiTile icon={<Moon size={18} />} label="Avg sleep" value={weeklyReview.current_week.avg_sleep_score ?? '—'} sublabel="per logged day" />
            <KpiTile icon={<Scale size={18} />} label="Weight change" value={weeklyReview.current_week.weight_change_kg != null ? `${weeklyReview.current_week.weight_change_kg > 0 ? '+' : ''}${weeklyReview.current_week.weight_change_kg} kg` : '—'} sublabel="this week" />
            <KpiTile icon={<Flame size={18} />} label="Est. fat loss" value={weeklyReview.current_week.estimated_fat_loss_kg != null ? `${weeklyReview.current_week.estimated_fat_loss_kg} kg` : '—'} sublabel="this week" />
          </div>

          <div className="todo-chart-card">
            <div className="todo-chart-head">
              <span className="todo-chart-title">Weekly consistency history</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[...weeklyReview.history, weeklyReview.current_week].map((w) => ({ week: w.week_start, rate: w.consistency_rate ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} unit="%" width={36} />
                <Tooltip contentStyle={{ fontSize: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]} fill="var(--accent1)" name="Consistency %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

export default TodoListPage
