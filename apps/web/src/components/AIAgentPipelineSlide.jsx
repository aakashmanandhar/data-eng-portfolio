import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { FileText, MessageSquare, Wrench, ShieldCheck, Sparkles, TrendingUp, Bot, ExternalLink, Activity, HelpCircle, Package, BookOpen, Library, Link2, Database, Rocket, Archive, Quote, Layers } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const SOURCE_META = {
  arxiv: { label: 'arXiv', color: '#2563EB', Icon: FileText },
  semantic_scholar: { label: 'Semantic Scholar', color: '#7C3AED', Icon: BookOpen },
  openalex: { label: 'OpenAlex', color: '#0D9488', Icon: Library },
  crossref: { label: 'Crossref', color: '#4F46E5', Icon: Link2 },
  dblp: { label: 'DBLP', color: '#0891B2', Icon: Database },
  hf_papers: { label: 'Hugging Face', color: '#D97706', Icon: Rocket },
  zenodo: { label: 'Zenodo', color: '#64748B', Icon: Archive },
  hackernews: { label: 'Hacker News', color: '#F97316', Icon: MessageSquare },
}
const PAPER_SOURCES = ['arxiv', 'semantic_scholar', 'openalex', 'crossref', 'dblp', 'hf_papers', 'zenodo']

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'to', 'in', 'on', 'with', 'via', 'using', 'from', 'based', 'is', 'are', 'this', 'towards', 'toward', 'new', 'study', 'analysis', 'approach', 'system', 'systems', 'model', 'models', 'data'])

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatDownloads(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n
}

function topKeyword(signals) {
  const counts = {}
  signals.slice(0, 300).forEach(s => {
    (s.title || '').toLowerCase().match(/[a-z][a-z-]{3,}/g)?.forEach(w => {
      if (!STOPWORDS.has(w)) counts[w] = (counts[w] || 0) + 1
    })
  })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || '—'
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

function SourceDistributionBar({ bySource }) {
  const total = Object.values(bySource).reduce((a, b) => a + b, 0) || 1
  const entries = Object.entries(bySource).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  return (
    <div className="agent-source-dist">
      <div className="agent-source-dist-track">
        {entries.map(([key, val]) => (
          <div key={key} style={{ width: `${(val / total) * 100}%`, background: SOURCE_META[key].color }} title={`${SOURCE_META[key].label}: ${val}`}></div>
        ))}
      </div>
      <div className="agent-source-dist-legend">
        {entries.map(([key, val]) => (
          <span key={key} className="agent-source-dist-item">
            <span className="agent-source-dist-dot" style={{ background: SOURCE_META[key].color }}></span>
            {SOURCE_META[key].label} <b>{val}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

function ToolLeaderboard({ tools }) {
  const max = Math.max(...tools.map(t => t.downloads), 1)
  return (
    <div className="agent-leaderboard">
      {tools.map((t, i) => (
        <div key={i} className="agent-leaderboard-row">
          <span className="agent-leaderboard-rank">#{i + 1}</span>
          <div className="agent-leaderboard-main">
            <div className="agent-leaderboard-top">
              <span className="agent-leaderboard-name">{t.name}</span>
              <span className="agent-leaderboard-value">{formatDownloads(t.downloads)}/mo</span>
            </div>
            <div className="agent-leaderboard-track">
              <div className="agent-leaderboard-fill" style={{ width: `${(t.downloads / max) * 100}%` }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AIAgentPipelineSlide() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  const [signals, setSignals] = useState([])
  const [trends, setTrends] = useState([])
  const [summary, setSummary] = useState(null)
  const [diagnoses, setDiagnoses] = useState([])
  const [dqActions, setDqActions] = useState([])
  const [feedTab, setFeedTab] = useState('papers')

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/research-signals/`).then(r => r.json()).then(setSignals).catch(console.error)
    fetch(`${API_BASE}/api/tool-adoption-trends/`).then(r => r.json()).then(setTrends).catch(console.error)
    fetch(`${API_BASE}/api/agent-activity-summary/`).then(r => r.json()).then(setSummary).catch(console.error)
    fetch(`${API_BASE}/api/agent-diagnosis-log/`).then(r => r.json()).then(setDiagnoses).catch(console.error)
    fetch(`${API_BASE}/api/data-quality-log/`).then(r => r.json()).then(setDqActions).catch(console.error)
  }, [])

  if (!summary) {
    return (
      <div className="agent-slide">
        <div className="layer-pending">
          <span className="layer-pending-icon">🤖</span>
          <div className="layer-pending-title">Booting up the research agents…</div>
        </div>
      </div>
    )
  }

  const bySource = {}
  Object.keys(SOURCE_META).forEach(k => { bySource[k] = 0 })
  signals.forEach(s => { if (bySource[s.source] !== undefined) bySource[s.source]++ })

  const paperCount = PAPER_SOURCES.reduce((sum, k) => sum + (bySource[k] || 0), 0)

  const feedSignals = (feedTab === 'papers'
    ? signals.filter(s => PAPER_SOURCES.includes(s.source))
    : signals.filter(s => s.source === 'hackernews')
  ).slice(0, isMobile ? 5 : 7)

  const mostCited = [...signals].filter(s => PAPER_SOURCES.includes(s.source)).sort((a, b) => (b.score || 0) - (a.score || 0))[0]

  const topTools = [...trends]
    .sort((a, b) => b.download_count - a.download_count)
    .slice(0, 6)
    .map(t => ({ name: t.tool_name, downloads: t.download_count }))

  const dayCounts = {}
  signals.forEach(s => {
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
          AI agents track the latest research and tools in data engineering across 7 real academic sources —
          then watch their own pipeline, diagnosing failures and catching data issues automatically.
        </p>
      </div>

      <div className="agent-kpi-row">
        <KpiTile icon={<FileText size={16} color="var(--accent1)" />} label="Papers Tracked" help="Real papers indexed across arXiv, Semantic Scholar, OpenAlex, Crossref, DBLP, Hugging Face, and Zenodo">
          <span className="agent-kpi-value">{paperCount.toLocaleString()}</span>
        </KpiTile>
        <KpiTile icon={<Layers size={16} color="var(--accent2)" />} label="Sources" help="Distinct research databases and APIs this pipeline pulls from">
          <span className="agent-kpi-value">{Object.keys(SOURCE_META).length}</span>
        </KpiTile>
        <KpiTile icon={<Sparkles size={16} color="#7C3AED" />} label="Top Keyword" help="Most frequent meaningful word across the 300 latest paper titles">
          <span className="agent-kpi-value agent-kpi-value-text">{topKeyword(signals)}</span>
        </KpiTile>
        <KpiTile icon={<ShieldCheck size={16} color="var(--green)" />} label="Self-Healing Rate" help="Share of pipeline failures the agent fixed automatically, with no human needed">
          <span className="agent-kpi-value" style={{ color: 'var(--green)' }}>{summary.self_healing_rate}%</span>
        </KpiTile>
        <KpiTile icon={<TrendingUp size={16} color="#D97706" />} label="Top Tool" help="The AI/data tool with the most downloads last month, by PyPI installs">
          <span className="agent-kpi-value agent-kpi-value-text">{topTools[0]?.name || '—'}</span>
        </KpiTile>
      </div>

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

      <div className="agent-panel">
        <h3 className="agent-panel-title"><Layers size={14} /> Signal Sources</h3>
        <p className="agent-panel-sub">Where today's research and tooling signals are coming from.</p>
        <SourceDistributionBar bySource={bySource} />
      </div>

      <div className="agent-panel">
        <h3 className="agent-panel-title"><Sparkles size={14} /> Signal Growth</h3>
        <p className="agent-panel-sub">New research signals discovered each day — a rising line means the field is heating up.</p>
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

      <div className="agent-main-grid">
        <div className="agent-panel">
          <h3 className="agent-panel-title"><FileText size={14} /> Latest Research & Tooling Signals</h3>
          <p className="agent-panel-sub">Fresh papers and discussions on data engineering &amp; AI, updated daily.</p>
          <div className="agent-feed-tabs">
            <button
              className={`agent-feed-tab ${feedTab === 'papers' ? 'agent-feed-tab-active' : ''}`}
              style={feedTab === 'papers' ? { background: 'var(--accent1)', borderColor: 'var(--accent1)' } : { borderColor: 'var(--accent1)', color: 'var(--accent1)' }}
              onClick={() => setFeedTab('papers')}
            >
              <FileText size={12} /> Papers ({paperCount})
            </button>
            <button
              className={`agent-feed-tab ${feedTab === 'hackernews' ? 'agent-feed-tab-active' : ''}`}
              style={feedTab === 'hackernews' ? { background: SOURCE_META.hackernews.color, borderColor: SOURCE_META.hackernews.color } : { borderColor: SOURCE_META.hackernews.color, color: SOURCE_META.hackernews.color }}
              onClick={() => setFeedTab('hackernews')}
            >
              <MessageSquare size={12} /> Hacker News ({bySource.hackernews})
            </button>
          </div>
          <div className="agent-signal-feed">
            {feedSignals.length === 0 && <div className="agent-activity-empty">No signals in this category yet.</div>}
            {feedSignals.map((s, i) => {
              const meta = SOURCE_META[s.source]
              return (
                <div key={i} className="agent-signal-item">
                  <meta.Icon size={14} color={meta.color} className="agent-signal-icon" />
                  <div className="agent-signal-body">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="agent-signal-title">
                      {s.title} <ExternalLink size={10} className="agent-signal-ext-icon" />
                    </a>
                    {s.summary && <p className="agent-signal-summary">{s.summary.slice(0, 140)}{s.summary.length > 140 ? '…' : ''}</p>}
                    <div className="agent-signal-meta">
                      <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span>
                      {s.authors && <span>· {s.authors.split(',').slice(0, 2).join(',')}{s.authors.split(',').length > 2 ? ' et al.' : ''}</span>}
                      {s.score > 0 && <span>· {s.score.toLocaleString()} {PAPER_SOURCES.includes(s.source) ? 'citations' : 'pts'}</span>}
                      <span>· {timeAgo(s.published_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="agent-panel">
          <h3 className="agent-panel-title"><Package size={14} /> Tool Adoption Leaderboard</h3>
          <p className="agent-panel-sub">Most-downloaded AI &amp; data tools on PyPI last month.</p>
          <ToolLeaderboard tools={topTools} />
        </div>

        <div className="agent-panel agent-activity-panel">
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
    </div>
  )
}

export default AIAgentPipelineSlide
