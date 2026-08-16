import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import { FileText, Github, MessageSquare, Wrench, ShieldCheck, Sparkles, TrendingUp, Bot, ExternalLink, Activity, HelpCircle, Package } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const SOURCE_META = {
  arxiv: { label: 'arXiv Papers', color: '#2563EB', Icon: FileText },
  github: { label: 'GitHub Repos', color: '#16A34A', Icon: Github },
  hackernews: { label: 'Hacker News', color: '#F97316', Icon: MessageSquare },
}

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

function SelfHealingGauge({ rate }) {
  const data = [{ name: 'rate', value: rate, fill: rate > 50 ? '#16A34A' : rate > 15 ? '#F97316' : 'var(--muted)' }]
  return (
    <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: 'var(--border)' }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text)' }}>
        {rate}%
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
  const [feedTab, setFeedTab] = useState('arxiv')

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

  const bySource = { arxiv: 0, github: 0, hackernews: 0 }
  signals.forEach(s => { if (bySource[s.source] !== undefined) bySource[s.source]++ })
  const pieData = Object.entries(bySource).map(([key, value]) => ({ name: SOURCE_META[key].label, value, color: SOURCE_META[key].color }))

  const feedSignals = signals.filter(s => s.source === feedTab).slice(0, isMobile ? 5 : 7)

  const topTools = [...trends]
    .sort((a, b) => b.download_count - a.download_count)
    .slice(0, 6)
    .map(t => ({ name: t.tool_name, downloads: t.download_count }))

  // Signal growth trend: count of signals by published day, last 14 days
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
          AI agents track the latest research and tools in data engineering — then watch their own pipeline,
          diagnosing failures and catching data issues automatically, without a human in the loop.
        </p>
      </div>

      <div className="agent-kpi-row">
        <KpiTile icon={<Activity size={16} color="var(--accent1)" />} label="Signals Tracked" help="Total papers, repos, and posts the agents are currently monitoring">
          <span className="agent-kpi-value">{signals.length}</span>
        </KpiTile>
        <KpiTile icon={<SelfHealingGauge rate={summary.self_healing_rate} />} label="Self-Healing Rate" help="Share of pipeline failures the agent fixed automatically, with no human needed">
          <span className="agent-kpi-sublabel">auto-fixed</span>
        </KpiTile>
        <KpiTile icon={<Wrench size={16} color="#F97316" />} label="Agent Diagnoses" help="Times an AI agent investigated a pipeline failure and explained the root cause">
          <span className="agent-kpi-value">{summary.total_diagnoses}</span>
        </KpiTile>
        <KpiTile icon={<ShieldCheck size={16} color="var(--green)" />} label="Quality Checks" help="Automated checks the agent ran to catch bad or missing data before it reached the site">
          <span className="agent-kpi-value">{summary.total_dq_actions}</span>
        </KpiTile>
        <KpiTile icon={<TrendingUp size={16} color="var(--accent2)" />} label="Top Tool" help="The AI/data tool with the most downloads last month, by PyPI installs">
          <span className="agent-kpi-value agent-kpi-value-text">{topTools[0]?.name || '—'}</span>
        </KpiTile>
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
          <p className="agent-panel-sub">Fresh papers, repos, and discussions on data engineering &amp; AI, updated daily.</p>
          <div className="agent-feed-tabs">
            {Object.entries(SOURCE_META).map(([key, meta]) => (
              <button
                key={key}
                className={`agent-feed-tab ${feedTab === key ? 'agent-feed-tab-active' : ''}`}
                style={feedTab === key ? { background: meta.color, borderColor: meta.color } : { borderColor: meta.color, color: meta.color }}
                onClick={() => setFeedTab(key)}
              >
                <meta.Icon size={12} />
                {meta.label} ({bySource[key]})
              </button>
            ))}
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
                      {s.authors && <span>{s.authors.split(',').slice(0, 2).join(',')}{s.authors.split(',').length > 2 ? ' et al.' : ''} ·</span>}
                      {s.score > 0 && <span>{s.score.toLocaleString()} pts ·</span>}
                      <span>{timeAgo(s.published_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="agent-panel">
          <h3 className="agent-panel-title"><Github size={14} /> Signal Mix</h3>
          <p className="agent-panel-sub">Where this week's signals are coming from.</p>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={50} paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="agent-pie-legend">
            {pieData.map((p, i) => (
              <span key={i} className="agent-pie-legend-item">
                <span className="agent-pie-legend-dot" style={{ background: p.color }}></span>
                {p.name}: {p.value}
              </span>
            ))}
          </div>

          <h3 className="agent-panel-title agent-panel-title-spaced"><Package size={14} /> Tool Adoption Leaderboard</h3>
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
