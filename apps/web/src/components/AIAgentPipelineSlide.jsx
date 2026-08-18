import { useState, useEffect } from 'react'
import { AreaChart, Area, ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import { FileText, Wrench, ShieldCheck, Sparkles, Bot, ExternalLink, HelpCircle, BookOpen, Library, Link2, Database, Rocket, Archive, Quote, Layers, Zap, Users, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const SOURCE_META = {
  arxiv: { label: 'arXiv', color: '#2563EB', Icon: FileText },
  semantic_scholar: { label: 'Semantic Scholar', color: '#7C3AED', Icon: BookOpen },
  openalex: { label: 'OpenAlex', color: '#0D9488', Icon: Library },
  crossref: { label: 'Crossref', color: '#4F46E5', Icon: Link2 },
  dblp: { label: 'DBLP', color: '#0891B2', Icon: Database },
  hf_papers: { label: 'Hugging Face', color: '#D97706', Icon: Rocket },
  zenodo: { label: 'Zenodo', color: '#64748B', Icon: Archive },
}
const PAPER_SOURCES = Object.keys(SOURCE_META)

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'to', 'in', 'on', 'with', 'via', 'using', 'from', 'based', 'is', 'are', 'this', 'towards', 'toward', 'new', 'study', 'analysis', 'approach', 'system', 'systems', 'model', 'models', 'data'])

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function topKeywords(signals, n) {
  const counts = {}
  signals.slice(0, 400).forEach(s => {
    (s.title || '').toLowerCase().match(/[a-z][a-z-]{3,}/g)?.forEach(w => {
      if (!STOPWORDS.has(w)) counts[w] = (counts[w] || 0) + 1
    })
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w)
}

function linearForecast(dayCounts, daysAhead) {
  const entries = Object.entries(dayCounts).sort((a, b) => a[0].localeCompare(b[0])).slice(-14)
  if (entries.length < 3) return { history: [], forecastTotal: 0, trendingUp: false, trendingDown: false }
  const xs = entries.map((_, i) => i)
  const ys = entries.map(([, c]) => c)
  const n = xs.length
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sumXX = xs.reduce((s, x) => s + x * x, 0)
  const denom = (n * sumXX - sumX * sumX) || 1
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  const history = entries.map(([day, count]) => ({ day: day.slice(5), actual: count, forecast: null }))
  let forecastTotal = 0
  for (let i = 0; i < daysAhead; i++) {
    const x = n + i
    const projected = Math.max(0, Math.round(intercept + slope * x))
    forecastTotal += projected
    const d = new Date(entries[entries.length - 1][0])
    d.setDate(d.getDate() + i + 1)
    history.push({ day: d.toISOString().slice(5, 10), actual: null, forecast: projected })
  }
  if (history.length > daysAhead) {
    history[history.length - daysAhead - 1].forecast = history[history.length - daysAhead - 1].actual
  }
  return { history, forecastTotal, trendingUp: slope > 0.05, trendingDown: slope < -0.05 }
}

function sourceMomentum(signals) {
  const now = Date.now()
  const weekMs = 7 * 86400000
  const bySource = {}
  PAPER_SOURCES.forEach(s => { bySource[s] = { thisWeek: 0, lastWeek: 0 } })
  signals.forEach(s => {
    if (!bySource[s.source]) return
    const age = now - new Date(s.published_at).getTime()
    if (age <= weekMs) bySource[s.source].thisWeek++
    else if (age <= weekMs * 2) bySource[s.source].lastWeek++
  })
  return Object.entries(bySource)
    .map(([key, v]) => {
      const change = v.lastWeek === 0 ? (v.thisWeek > 0 ? 100 : 0) : Math.round(((v.thisWeek - v.lastWeek) / v.lastWeek) * 100)
      return { source: key, thisWeek: v.thisWeek, change }
    })
    .sort((a, b) => b.thisWeek - a.thisWeek)
    .slice(0, 5)
}

function KpiTile({ icon, label, help, children }) {
  return (
    <div className="agent-kpi-tile">
      {icon}
      <div className="agent-kpi-text">
        <span className="agent-kpi-label">
          {label}
          <span className="agent-kpi-help">
            <HelpCircle size={10} />
            <span className="agent-kpi-tooltip">{help}</span>
          </span>
        </span>
        {children}
      </div>
    </div>
  )
}

function SourceRing({ label, color, Icon, value, pct }) {
  const data = [{ v: pct, fill: color }]
  return (
    <div className="agent-source-ring">
      <div style={{ position: 'relative', width: 52, height: 52 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background={{ fill: 'var(--border)' }} dataKey="v" cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="agent-source-ring-icon"><Icon size={15} color={color} /></div>
      </div>
      <span className="agent-source-ring-label">{label}</span>
      <span className="agent-source-ring-value">{value}</span>
    </div>
  )
}

function SourceDistributionBar({ bySource }) {
  const total = Object.values(bySource).reduce((a, b) => a + b, 0) || 1
  const entries = Object.entries(bySource).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  return (
    <div className="agent-source-ring-grid">
      {entries.map(([key, val]) => (
        <SourceRing key={key} label={SOURCE_META[key].label} color={SOURCE_META[key].color} Icon={SOURCE_META[key].Icon} value={val} pct={Math.round((val / total) * 100)} />
      ))}
    </div>
  )
}

function ForecastPanel({ dayCounts }) {
  const { history, forecastTotal, trendingUp, trendingDown } = linearForecast(dayCounts, 7)
  const TrendIcon = trendingUp ? TrendingUp : trendingDown ? TrendingDown : Minus
  const trendColor = trendingUp ? 'var(--green)' : trendingDown ? '#EF4444' : 'var(--muted)'
  return (
    <div className="agent-panel">
      <h3 className="agent-panel-title"><Activity size={14} /> 7-Day Forecast</h3>
      <p className="agent-panel-sub">Projected paper volume, based on a linear trend over the last 14 days.</p>
      <div className="agent-forecast-hero">
        <TrendIcon size={20} color={trendColor} />
        <div className="agent-forecast-hero-text">
          <span className="agent-forecast-hero-value">~{forecastTotal}</span>
          <span className="agent-forecast-hero-label">papers expected next 7 days</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={70}>
        <ComposedChart data={history} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
          <XAxis dataKey="day" tick={{ fontSize: 8, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 10 }} />
          <Line type="monotone" dataKey="actual" stroke="var(--accent1)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="forecast" stroke="var(--accent2)" strokeWidth={2} strokeDasharray="4 3" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function MomentumPanel({ signals }) {
  const rows = sourceMomentum(signals)
  const max = Math.max(...rows.map(r => r.thisWeek), 1)
  return (
    <div className="agent-panel">
      <h3 className="agent-panel-title"><Zap size={14} /> Source Momentum</h3>
      <p className="agent-panel-sub">This week's paper count per source vs. the week before.</p>
      <div className="agent-momentum-list">
        {rows.map((r, i) => {
          const meta = SOURCE_META[r.source]
          const TrendIcon = r.change > 0 ? TrendingUp : r.change < 0 ? TrendingDown : Minus
          const trendColor = r.change > 0 ? 'var(--green)' : r.change < 0 ? '#EF4444' : 'var(--muted)'
          return (
            <div key={i} className="agent-momentum-row">
              <meta.Icon size={13} color={meta.color} />
              <span className="agent-momentum-label">{meta.label}</span>
              <div className="agent-momentum-track">
                <div className="agent-momentum-fill" style={{ width: `${(r.thisWeek / max) * 100}%`, background: meta.color }}></div>
              </div>
              <span className="agent-momentum-count">{r.thisWeek}</span>
              <span className="agent-momentum-change" style={{ color: trendColor }}>
                <TrendIcon size={11} /> {Math.abs(r.change)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AIAgentPipelineSlide() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  const [signals, setSignals] = useState([])
  const [summary, setSummary] = useState(null)
  const [diagnoses, setDiagnoses] = useState([])
  const [dqActions, setDqActions] = useState([])
  const [sourceFilter, setSourceFilter] = useState(null)
  const [filteredSignals, setFilteredSignals] = useState([])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/research-signals/`).then(r => r.json()).then(setSignals).catch(console.error)
    fetch(`${API_BASE}/api/agent-activity-summary/`).then(r => r.json()).then(setSummary).catch(console.error)
    fetch(`${API_BASE}/api/agent-diagnosis-log/`).then(r => r.json()).then(setDiagnoses).catch(console.error)
    fetch(`${API_BASE}/api/data-quality-log/`).then(r => r.json()).then(setDqActions).catch(console.error)
  }, [])

  useEffect(() => {
    if (!sourceFilter) return
    fetch(`${API_BASE}/api/research-signals/?source=${sourceFilter}`).then(r => r.json()).then(setFilteredSignals).catch(console.error)
  }, [sourceFilter])

  if (!summary) {
    return (
      <div className="agent-slide">
        <div className="layer-pending">
          <span className="layer-pending-icon">📚</span>
          <div className="layer-pending-title">Booting up the research agents…</div>
        </div>
      </div>
    )
  }

  const papers = signals.filter(s => SOURCE_META[s.source])

  const bySource = {}
  Object.keys(SOURCE_META).forEach(k => { bySource[k] = 0 })
  papers.forEach(s => { if (bySource[s.source] !== undefined) bySource[s.source]++ })

  const now = Date.now()
  const freshCount = papers.filter(s => (now - new Date(s.published_at).getTime()) / 86400000 <= 7).length
  const freshPct = papers.length ? Math.round((freshCount / papers.length) * 100) : 0

  const uniqueAuthors = new Set()
  papers.forEach(s => (s.authors || '').split(',').forEach(a => { if (a.trim()) uniqueAuthors.add(a.trim().toLowerCase()) }))

  const keywords = topKeywords(papers, 4)

  const feedSignals = sourceFilter ? filteredSignals.filter(s => SOURCE_META[s.source]) : papers.slice(0, isMobile ? 30 : 50)

  const mostCited = [...papers].sort((a, b) => (b.score || 0) - (a.score || 0))[0]

  const dayCounts = {}
  papers.forEach(s => {
    const day = (s.published_at || '').slice(0, 10)
    if (day) dayCounts[day] = (dayCounts[day] || 0) + 1
  })
  const trendData = Object.entries(dayCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([day, count]) => ({ day: day.slice(5), count }))

  const activityFeed = [
    ...diagnoses.map(d => ({ type: 'diagnosis', ...d, ts: d.created_at })),
    ...dqActions.map(a => ({ type: 'dq', ...a, ts: a.created_at })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6)

  return (
    <div className="agent-slide">
      <div className="agent-intro">
        <div className="agent-intro-badge">
          <Bot size={13} />
          <span>Self-Healing Research Pipeline</span>
        </div>
        <p className="agent-intro-text">
          AI agents track the latest research on data engineering and AI across 7 real academic databases —
          then watch their own pipeline, diagnosing failures and catching data issues automatically.
        </p>
      </div>

      <div className="agent-kpi-row">
        <KpiTile icon={<FileText size={16} color="var(--accent1)" />} label="Papers Tracked" help="Real papers indexed across arXiv, Semantic Scholar, OpenAlex, Crossref, DBLP, Hugging Face, and Zenodo">
          <span className="agent-kpi-value">{papers.length.toLocaleString()}</span>
        </KpiTile>
        <KpiTile icon={<Zap size={16} color="#D97706" />} label="Published This Week" help="Share of tracked papers published in the last 7 days — how current this collection is">
          <span className="agent-kpi-value">{freshPct}%</span>
        </KpiTile>
        <KpiTile icon={<Users size={16} color="#0D9488" />} label="Unique Authors" help="Distinct author names appearing across all tracked papers">
          <span className="agent-kpi-value">{uniqueAuthors.size.toLocaleString()}</span>
        </KpiTile>
        <KpiTile icon={<Sparkles size={16} color="#7C3AED" />} label="Trending Terms" help="Most frequent meaningful words across the 400 latest paper titles">
          <span className="agent-kpi-value agent-kpi-value-text">{keywords[0] || '—'}</span>
        </KpiTile>
        <KpiTile icon={<ShieldCheck size={16} color="var(--green)" />} label="Self-Healing Rate" help="Share of pipeline failures the agent fixed automatically, with no human needed">
          <span className="agent-kpi-value" style={{ color: 'var(--green)' }}>{summary.self_healing_rate}%</span>
        </KpiTile>
      </div>

      {keywords.length > 0 && (
        <div className="agent-keyword-row">
          {keywords.map((k, i) => <span key={i} className="agent-keyword-pill">#{k}</span>)}
        </div>
      )}

      {mostCited && (
        <div className="agent-featured-card">
          <span className="agent-featured-badge"><Quote size={12} /> Most Cited This Week</span>
          <a href={mostCited.url} target="_blank" rel="noopener noreferrer" className="agent-featured-title">
            {mostCited.title} <ExternalLink size={12} className="agent-signal-ext-icon" />
          </a>
          <div className="agent-featured-meta">
            <span style={{ color: SOURCE_META[mostCited.source]?.color, fontWeight: 700 }}>{SOURCE_META[mostCited.source]?.label}</span>
            <span>· {(mostCited.score || 0).toLocaleString()} citations</span>
            <span>· {timeAgo(mostCited.published_at)}</span>
          </div>
        </div>
      )}

      <div className="agent-triple-grid">
        <div className="agent-panel">
          <h3 className="agent-panel-title"><Layers size={14} /> Where Papers Come From</h3>
          <p className="agent-panel-sub">Distribution across the 7 tracked academic sources.</p>
          <SourceDistributionBar bySource={bySource} />
        </div>
        <ForecastPanel dayCounts={dayCounts} />
        <MomentumPanel signals={papers} />
      </div>

      <div className="agent-panel">
        <h3 className="agent-panel-title"><Sparkles size={14} /> Signal Growth</h3>
        <p className="agent-panel-sub">New papers discovered each day — a rising line means the field is heating up.</p>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="signalGrowthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
            <Area type="monotone" dataKey="count" stroke="var(--accent1)" strokeWidth={2} fill="url(#signalGrowthFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="agent-panel">
        <h3 className="agent-panel-title"><FileText size={14} /> Latest Research Papers</h3>
        <p className="agent-panel-sub">Fresh papers on data engineering &amp; AI, updated daily.</p>
        <div className="agent-source-filters">
          {Object.entries(SOURCE_META).map(([key, meta]) => (
            <button
              key={key}
              className={`agent-source-pill ${sourceFilter === key ? 'agent-source-pill-active' : ''}`}
              style={sourceFilter === key ? { background: meta.color, borderColor: meta.color, color: '#fff' } : { borderColor: meta.color, color: meta.color }}
              onClick={() => setSourceFilter(sourceFilter === key ? null : key)}
            >
              <meta.Icon size={11} /> {meta.label} ({bySource[key]})
            </button>
          ))}
        </div>
        <div className="agent-signal-feed-wide">
          {feedSignals.length === 0 && <div className="agent-activity-empty">No papers in this category yet.</div>}
          {feedSignals.map((s, i) => {
            const meta = SOURCE_META[s.source]
            return (
              <div key={i} className="agent-signal-card">
                <meta.Icon size={14} color={meta.color} className="agent-signal-icon" />
                <div className="agent-signal-body">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="agent-signal-title">
                    {s.title} <ExternalLink size={10} className="agent-signal-ext-icon" />
                  </a>
                  {s.summary && <p className="agent-signal-summary">{s.summary.slice(0, 140)}{s.summary.length > 140 ? '…' : ''}</p>}
                  <div className="agent-signal-meta">
                    <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                    {s.authors && <span>· {s.authors.split(',').slice(0, 2).join(',')}{s.authors.split(',').length > 2 ? ' et al.' : ''}</span>}
                    {s.score > 0 && <span>· {s.score.toLocaleString()} citations</span>}
                    <span>· {timeAgo(s.published_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="agent-panel agent-activity-panel-wide">
        <h3 className="agent-panel-title"><Bot size={14} /> Agent Activity Log</h3>
        <p className="agent-panel-sub">Every time an agent catches or fixes a problem in this pipeline, it shows up here.</p>
        <div className="agent-activity-feed">
          {activityFeed.length === 0 && (
            <div className="agent-activity-empty">
              <ShieldCheck size={16} color="var(--green)" />
              No agent actions yet — pipeline is running clean.
            </div>
          )}
          {activityFeed.map((item, i) => (
            <div key={i} className="agent-activity-item">
              <span className={`agent-activity-badge agent-activity-badge-${item.type}`}>
                {item.type === 'diagnosis' ? <><Wrench size={10} /> Diagnosis</> : <><ShieldCheck size={10} /> Quality Check</>}
              </span>
              <p className="agent-activity-text">
                {item.type === 'diagnosis' ? item.diagnosis : item.reasoning}
              </p>
              <span className="agent-activity-ts">{timeAgo(item.ts)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AIAgentPipelineSlide
