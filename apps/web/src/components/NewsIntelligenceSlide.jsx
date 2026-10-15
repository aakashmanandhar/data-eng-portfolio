import { useEffect, useMemo, useState } from 'react'
import { hierarchy, pack } from 'd3-hierarchy'
import { Search, X, ChevronDown, Info, RefreshCw, ExternalLink, Newspaper, Clock, Globe2, Hash, Radio } from 'lucide-react'
import { SlideSkeleton } from './SiteExtras'
import LineageExplorer from './LineageExplorer'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const PAGE = 10

const COLORS = { positive: '#3B6D11', negative: '#D14545', neutral: '#8A8875' }
const sentimentColor = (s) => (s > 0.15 ? COLORS.positive : s < -0.15 ? COLORS.negative : COLORS.neutral)
const sentimentWord = (s) => (s > 0.15 ? 'Positive' : s < -0.15 ? 'Negative' : 'Mixed')
const isScored = (a) => a.sentiment_label != null && a.sentiment_label !== ''
const okJson = (r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() }

function timeAgo(dateStr) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function dedupeArticles(articles) {
  const by = {}
  for (const a of articles) {
    if (!by[a.title]) by[a.title] = { ...a, sources: [a.source_domain] }
    else if (!by[a.title].sources.includes(a.source_domain)) by[a.title].sources.push(a.source_domain)
  }
  return Object.values(by)
}

function SentimentBar({ score }) {
  const pct = Math.max(0, Math.min(100, ((score + 1) / 2) * 100))
  const color = sentimentColor(score)
  return (
    <div className="nx-sbar">
      <b style={{ color }}>{sentimentWord(score)}</b>
      <div className="nx-sbar-track"><span style={{ left: `${pct}%`, background: color }} /></div>
      <div className="nx-sbar-scale"><span>Negative</span><span>Positive</span></div>
    </div>
  )
}

function Bubbles({ data, width, height, active, onSelect }) {
  const valid = data.filter((d) => d.count > 0)
  if (!valid.length) return null
  const leaves = pack().size([width, height]).padding(5)(hierarchy({ children: valid }).sum((d) => d.count)).leaves()
  const max = Math.max(...valid.map((d) => d.count))
  return (
    <svg className="nx-bubbles" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Topic bubbles sized by article count">
      {leaves.map((l) => {
        const t = l.data
        const fill = t.scored ? sentimentColor(t.sentiment) : 'var(--accent1)'
        const op = t.scored ? Math.max(0.5, Math.min(1, Math.abs(t.sentiment) + 0.4)) : 0.3 + 0.6 * (t.count / max)
        const on = active === t.name
        return (
          <g key={t.name} onClick={() => onSelect(t.name)} style={{ cursor: 'pointer' }}>
            <title>{`${t.name}: ${t.count} article${t.count === 1 ? '' : 's'}`}</title>
            <circle cx={l.x} cy={l.y} r={l.r} fill={fill} fillOpacity={op} stroke={on ? 'var(--text)' : 'var(--bg-alt)'} strokeWidth={on ? 3 : 2.5} />
            {l.r > 20 && (
              <text x={l.x} y={l.y + 4} textAnchor="middle" fontSize={Math.min(l.r * 0.3, 12)} fill="#fff" fontWeight={700}>
                {t.name.length > 13 ? `${t.name.slice(0, 11)}…` : t.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function NewsIntelligenceSlide() {
  const [kpi, setKpi] = useState(null)
  const [trend, setTrend] = useState([])
  const [base, setBase] = useState([])
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState(null)
  const [kwList, setKwList] = useState(null)
  const [sent, setSent] = useState('all')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [open, setOpen] = useState(null)
  const [view, setView] = useState('bars')
  const [trace, setTrace] = useState(null)
  const [reloads, setReloads] = useState(0)
  const [narrow, setNarrow] = useState(window.innerWidth <= 480)

  useEffect(() => {
    const h = () => setNarrow(window.innerWidth <= 480)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    let live = true
    setError(null)
    Promise.all([
      fetch(`${API_BASE}/api/news-kpi-summary/`).then(okJson),
      fetch(`${API_BASE}/api/news-sentiment-trend/`).then(okJson).catch(() => []),
      fetch(`${API_BASE}/api/news-articles/`).then(okJson),
    ]).then(([k, t, a]) => {
      if (!live) return
      setKpi(k)
      setTrend(Array.isArray(t) ? t : [])
      setBase(dedupeArticles(Array.isArray(a) ? a : []))
    }).catch(() => { if (live) setError('We could not reach the news service just now.') })
    return () => { live = false }
  }, [reloads])

  // topic filter: ask the API for that topic's articles (can be more than the 50 in view)
  useEffect(() => {
    setKwList(null)
    setShown(PAGE)
    if (!keyword) return undefined
    let live = true
    fetch(`${API_BASE}/api/news-articles/?keyword=${encodeURIComponent(keyword)}`).then(okJson)
      .then((a) => { if (live) setKwList(dedupeArticles(Array.isArray(a) ? a : [])) })
      .catch(() => {})
    return () => { live = false }
  }, [keyword])

  useEffect(() => { setShown(PAGE) }, [sent, query])

  const anyScored = useMemo(() => base.some(isScored) || Number.isFinite(kpi?.overall_sentiment) || trend.length > 0, [base, kpi, trend])

  // topics: prefer the warehouse trend table, otherwise count the articles themselves
  const topics = useMemo(() => {
    const latest = {}
    trend.forEach((r) => { if (!latest[r.keyword] || r.sentiment_date > latest[r.keyword].sentiment_date) latest[r.keyword] = r })
    const fromTrend = Object.values(latest).filter((r) => r.mention_count > 0)
      .map((r) => ({ name: r.keyword, count: r.mention_count, sentiment: r.weighted_sentiment, scored: Number.isFinite(r.weighted_sentiment) }))
    if (fromTrend.length) return fromTrend.sort((a, b) => b.count - a.count).slice(0, 12)
    const m = {}
    base.forEach((a) => {
      const k = a.matched_keyword
      if (!k) return
      m[k] = m[k] || { name: k, count: 0, sum: 0, n: 0 }
      m[k].count += 1
      if (isScored(a)) { m[k].sum += a.sentiment_polarity || 0; m[k].n += 1 }
    })
    return Object.values(m).map((t) => ({ name: t.name, count: t.count, sentiment: t.n ? t.sum / t.n : 0, scored: t.n > 0 }))
      .sort((a, b) => b.count - a.count).slice(0, 12)
  }, [trend, base])

  const sources = useMemo(() => {
    const m = {}
    base.forEach((a) => a.sources.forEach((s) => { m[s] = (m[s] || 0) + 1 }))
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [base])

  const days = useMemo(() => {
    const out = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
      out.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), n: 0 })
    }
    base.forEach((a) => {
      const k = new Date(a.published_at).toISOString().slice(0, 10)
      const hit = out.find((d) => d.key === k)
      if (hit) hit.n += 1
    })
    return out
  }, [base])

  const overall = useMemo(() => {
    if (Number.isFinite(kpi?.overall_sentiment)) return kpi.overall_sentiment
    const s = base.filter(isScored)
    return s.length ? s.reduce((x, a) => x + (a.sentiment_polarity || 0), 0) / s.length : null
  }, [kpi, base])

  const freshest = base.length ? base.reduce((m, a) => (a.published_at > m ? a.published_at : m), base[0].published_at) : null

  const pool = keyword ? (kwList || base.filter((a) => a.matched_keyword === keyword)) : base
  const rows = pool.filter((a) => {
    if (sent === 'unscored' ? isScored(a) : sent !== 'all' && (!isScored(a) || sentimentWord(a.sentiment_polarity || 0).toLowerCase() !== sent)) return false
    const q = query.trim().toLowerCase()
    return !q || `${a.title} ${a.matched_keyword} ${a.sources.join(' ')}`.toLowerCase().includes(q)
  })
  const filtersOn = !!keyword || sent !== 'all' || !!query.trim()
  const clearAll = () => { setKeyword(null); setSent('all'); setQuery('') }

  if (error) {
    return (
      <div className="gx-slide nx-slide">
        <div className="sx-empty">
          <Newspaper size={28} />
          <p>{error} The wire usually refreshes within a few minutes.</p>
          <button type="button" onClick={() => setReloads((n) => n + 1)}><RefreshCw size={13} /> Try again</button>
        </div>
      </div>
    )
  }
  if (!kpi) return <div className="gx-slide nx-slide"><SlideSkeleton label="Loading live intelligence…" /></div>

  const maxTopic = topics.length ? topics[0].count : 1
  const topSource = sources[0]
  const lead = topics[0]
  const traceBtn = (model) => (
    <button type="button" className="nx-trace" onClick={() => setTrace(model)} aria-label="Trace where this number comes from" title="Trace where this number comes from"><Search size={12} /></button>
  )
  const counts = { positive: 0, mixed: 0, negative: 0 }
  base.filter(isScored).forEach((a) => { counts[sentimentWord(a.sentiment_polarity || 0).toLowerCase()] += 1 })
  const maxDay = Math.max(1, ...days.map((d) => d.n))

  return (
    <div className="gx-slide nx-slide">
      <div className="gx-head">
        <div>
          <div className="eyebrow gx-eyebrow">News &amp; Sentiment · What data engineers are reading</div>
          <p className="gx-sub">A live wire of data-engineering news and discussion, matched to the tools and topics this site tracks. Pick a topic to filter the feed.</p>
        </div>
        <div className="nx-status">
          {freshest && <span className="gx-live"><i />Latest story {timeAgo(freshest)}</span>}
          <span className={`nx-chip ${anyScored ? 'ok' : 'warn'}`}>{anyScored ? 'Sentiment scored' : 'Sentiment pending'}</span>
        </div>
      </div>

      <div className="gx-kpis nx-kpis">
        <div className="gx-kpi">{traceBtn('silver_news_articles')}<span className="gx-kpi-ico"><Newspaper size={16} /></span><div><div className="gx-kpi-val">{kpi.total_articles}</div><div className="gx-kpi-lbl">Articles tracked</div></div></div>
        <div className="gx-kpi">{traceBtn('fact_keyword_mention')}<span className="gx-kpi-ico"><Hash size={16} /></span><div><div className="gx-kpi-val">{kpi.top_keyword?.keyword || '—'}</div><div className="gx-kpi-lbl">Top topic{kpi.top_keyword ? ` · ${Math.round(kpi.top_keyword.total_mentions)} mentions` : ''}</div></div></div>
        <div className="gx-kpi"><span className="gx-kpi-ico"><Globe2 size={16} /></span><div><div className="gx-kpi-val">{sources.length}</div><div className="gx-kpi-lbl">Sources in the latest {base.length}</div></div></div>
        <div className="gx-kpi"><span className="gx-kpi-ico"><Clock size={16} /></span><div><div className="gx-kpi-val">{freshest ? timeAgo(freshest) : '—'}</div><div className="gx-kpi-lbl">Freshest story</div></div></div>
        <div className="gx-kpi nx-kpi-sent">{traceBtn('fact_keyword_sentiment_trend')}
          {overall !== null ? <div className="nx-kpi-bar"><SentimentBar score={overall} /></div>
            : <><span className="gx-kpi-ico nx-ico-warn"><Radio size={16} /></span><div><div className="gx-kpi-val">Pending</div><div className="gx-kpi-lbl">Sentiment not scored yet</div></div></>}
        </div>
      </div>

      {!anyScored && (
        <div className="nx-note" role="status">
          <Info size={15} />
          <span><b>Sentiment scoring hasn't produced results yet.</b> Rather than guess, the slide ranks topics by how often they are covered and leaves sentiment blank. Positive and negative colours will appear automatically once scores arrive.</span>
        </div>
      )}

      <div className="gx-grid nx-grid">
        <section className="gx-card nx-wire" aria-label="Live wire">
          <div className="nx-wire-top">
            <div><div className="gx-card-title">Live wire</div><p className="gx-card-sub">{rows.length} {rows.length === 1 ? 'story' : 'stories'}{filtersOn ? ' match your filters' : ' in the latest feed'}</p></div>
            {filtersOn && <button type="button" className="nx-clear" onClick={clearAll}><X size={12} /> Clear filters</button>}
          </div>
          <label className="nx-search">
            <Search size={14} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search headlines, topics or sources" aria-label="Search the news feed" />
          </label>
          <div className="nx-topic-chips" role="group" aria-label="Filter by topic">
            {topics.slice(0, 8).map((t) => (
              <button key={t.name} type="button" className={keyword === t.name ? 'on' : ''} onClick={() => setKeyword(keyword === t.name ? null : t.name)}>{t.name} <em>{t.count}</em></button>
            ))}
          </div>
          {anyScored && (
            <div className="nx-sent-filter" role="group" aria-label="Filter by sentiment">
              {[['all', 'All'], ['positive', 'Positive'], ['mixed', 'Mixed'], ['negative', 'Negative'], ['unscored', 'Unscored']].map(([id, label]) => (
                <button key={id} type="button" className={sent === id ? 'on' : ''} onClick={() => setSent(id)}>{label}</button>
              ))}
            </div>
          )}
          <div className="nx-timeline">
            {rows.length === 0 && (
              <div className="nx-empty">
                <Newspaper size={22} />
                <p>{keyword && !kwList ? `Loading stories about ${keyword}…` : filtersOn ? 'Nothing matches those filters in the last 30 days.' : 'No stories to show right now.'}</p>
                {filtersOn && <button type="button" onClick={clearAll}>Clear filters</button>}
              </div>
            )}
            {rows.slice(0, shown).map((a, i, arr) => {
              const key = a.url || a.title
              const isOpen = open === key
              const pol = a.sentiment_polarity || 0
              const scored = isScored(a)
              return (
                <div key={key} className="nx-row">
                  <div className="nx-rail">
                    <span className="nx-dot" style={{ background: scored ? sentimentColor(pol) : 'var(--border)' }} title={scored ? sentimentWord(pol) : 'Sentiment not scored'} />
                    {i < arr.length - 1 && <span className="nx-line" />}
                  </div>
                  <div className="nx-item">
                    <button type="button" className="nx-item-head" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}>
                      <span className="nx-title">{a.title}</span>
                      <ChevronDown size={14} className={isOpen ? 'open' : ''} />
                    </button>
                    <div className="nx-meta">
                      {a.matched_keyword && <button type="button" className="nx-pill" onClick={() => setKeyword(a.matched_keyword)}>{a.matched_keyword}</button>}
                      {scored && <span className="nx-tag" style={{ color: sentimentColor(pol) }}>{sentimentWord(pol)}</span>}
                      <span>{a.sources.length > 1 ? `${a.sources.length} sources` : a.source_domain} · {timeAgo(a.published_at)}</span>
                    </div>
                    {isOpen && (
                      <div className="nx-expand">
                        {a.description && <p>{a.description}</p>}
                        <a href={a.url} target="_blank" rel="noopener noreferrer">Read full article <ExternalLink size={12} /></a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {rows.length > shown && (
              <button type="button" className="nx-more" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, rows.length - shown)} more <ChevronDown size={13} /></button>
            )}
          </div>
        </section>

        <div className="gx-col">
          <section className="gx-card" aria-label="Most-discussed topics">
            <div className="nx-card-top">
              <div><div className="gx-card-title">Most-discussed topics</div><p className="gx-card-sub">{anyScored ? 'Sized by coverage, coloured by sentiment.' : 'Ranked by how often each topic is covered.'}</p></div>
              <div className="nx-seg" role="group" aria-label="Chart style">
                <button type="button" className={view === 'bars' ? 'on' : ''} onClick={() => setView('bars')}>Bars</button>
                <button type="button" className={view === 'bubbles' ? 'on' : ''} onClick={() => setView('bubbles')}>Bubbles</button>
              </div>
            </div>
            {topics.length === 0 && <div className="nx-empty"><p>No topics to rank yet.</p></div>}
            {view === 'bars' && topics.length > 0 && (
              <ul className="gx-bars nx-bars">
                {topics.slice(0, 8).map((t) => (
                  <li key={t.name}>
                    <button type="button" className={`nx-bar-name${keyword === t.name ? ' on' : ''}`} onClick={() => setKeyword(keyword === t.name ? null : t.name)}>{t.name}</button>
                    <span className="gx-bars-track"><i style={{ width: `${Math.max(6, (t.count / maxTopic) * 100)}%`, background: t.scored ? sentimentColor(t.sentiment) : undefined }} /></span>
                    <b>{t.count}</b>
                  </li>
                ))}
              </ul>
            )}
            {view === 'bubbles' && topics.length > 0 && <Bubbles data={topics} width={narrow ? 300 : 380} height={narrow ? 220 : 250} active={keyword} onSelect={(n) => setKeyword(keyword === n ? null : n)} />}
            {anyScored && (
              <div className="nx-legend">
                <span><i style={{ background: COLORS.positive }} />Positive</span>
                <span><i style={{ background: COLORS.negative }} />Negative</span>
                <span><i style={{ background: COLORS.neutral }} />Mixed</span>
              </div>
            )}
            {lead && (
              <p className="nx-insight">
                <b>{lead.name}</b> leads the feed with {lead.count} {lead.count === 1 ? 'story' : 'stories'}
                {topics[1] ? `, ahead of ${topics[1].name} (${topics[1].count})` : ''}.
                {topSource ? ` ${topSource[0]} is the busiest source (${topSource[1]} of the latest ${base.length}).` : ''}
              </p>
            )}
          </section>

          <section className="gx-card" aria-label="Coverage over time and sources">
            <div className="gx-card-title">Coverage and sources</div>
            <p className="gx-card-sub">Stories per day over two weeks, from the latest {base.length} articles.</p>
            <div className="nx-days" role="img" aria-label="Stories per day for the last 14 days">
              {days.map((d) => (
                <span key={d.key} className="nx-day" title={`${d.label}: ${d.n} ${d.n === 1 ? 'story' : 'stories'}`}>
                  <i style={{ height: `${d.n ? Math.max(8, (d.n / maxDay) * 100) : 3}%` }} className={d.n ? '' : 'zero'} />
                </span>
              ))}
            </div>
            <div className="nx-days-axis"><span>{days[0].label}</span><span>Today</span></div>
            {sources.length > 0 && (
              <ul className="nx-sources">
                {sources.slice(0, 4).map(([s, n]) => (
                  <li key={s}><span>{s}</span><span className="nx-src-bar"><i style={{ width: `${(n / sources[0][1]) * 100}%` }} /></span><b>{n}</b></li>
                ))}
              </ul>
            )}
            {anyScored && base.some(isScored) && (
              <div className="nx-split" aria-label="Sentiment split">
                <span style={{ flex: counts.positive || 0.001, background: COLORS.positive }} title={`${counts.positive} positive`} />
                <span style={{ flex: counts.mixed || 0.001, background: COLORS.neutral }} title={`${counts.mixed} mixed`} />
                <span style={{ flex: counts.negative || 0.001, background: COLORS.negative }} title={`${counts.negative} negative`} />
              </div>
            )}
          </section>
        </div>
      </div>
      {trace && <LineageExplorer modelName={trace} onClose={() => setTrace(null)} />}
    </div>
  )
}

export default NewsIntelligenceSlide
