import { useState, useEffect } from 'react'
import { hierarchy, pack } from 'd3-hierarchy'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const SENTIMENT_COLORS = { positive: '#3B6D11', negative: '#D14545', neutral: '#8A8875' }

function sentimentColor(score) {
  if (score > 0.15) return SENTIMENT_COLORS.positive
  if (score < -0.15) return SENTIMENT_COLORS.negative
  return SENTIMENT_COLORS.neutral
}
function sentimentLabel(score) {
  if (score > 0.15) return 'Leaning Positive'
  if (score < -0.15) return 'Leaning Negative'
  return 'Mixed / Neutral'
}
function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
function dedupeArticles(articles) {
  const byTitle = {}
  for (const a of articles) {
    if (!byTitle[a.title]) byTitle[a.title] = { ...a, sources: [a.source_domain] }
    else byTitle[a.title].sources.push(a.source_domain)
  }
  return Object.values(byTitle)
}

function SentimentGauge({ score, size = 68 }) {
  const pct = Math.max(0, Math.min(100, ((score + 1) / 2) * 100))
  const radius = size / 2 - 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)
  const color = sentimentColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={6}
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.24, fontWeight: 800, color: 'var(--text)',
      }}>
        {Math.round(pct)}%
      </div>
    </div>
  )
}

function BubbleChart({ data, width, height, onSelect, highlightNames = [] }) {
  const root = hierarchy({ children: data }).sum(d => d.value)
  const packLayout = pack().size([width, height]).padding(5)
  const leaves = packLayout(root).leaves()
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {leaves.map((leaf, i) => {
        const showLabel = leaf.r > 22 || highlightNames.includes(leaf.data.name)
        return (
          <g key={i} onClick={() => onSelect(leaf.data.name)} style={{ cursor: 'pointer' }}>
            <circle
              className="news-bubble-circle"
              cx={leaf.x} cy={leaf.y} r={leaf.r}
              fill={sentimentColor(leaf.data.sentiment)}
              fillOpacity={Math.max(0.45, Math.min(1, Math.abs(leaf.data.sentiment)))}
              stroke="var(--bg-alt)" strokeWidth={2.5}
            />
            {showLabel && (
              <text x={leaf.x} y={leaf.y + 4} textAnchor="middle" fontSize={Math.min(leaf.r * 0.24, 12)} fill="#fff" fontWeight={700}>
                {leaf.data.name.length > 14 ? leaf.data.name.slice(0, 12) + '…' : leaf.data.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function NewsIntelligenceSlide() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const [kpi, setKpi] = useState(null)
  const [sentimentTrend, setSentimentTrend] = useState([])
  const [articles, setArticles] = useState([])
  const [selectedKeyword, setSelectedKeyword] = useState(null)
  const [expandedIdx, setExpandedIdx] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/news-kpi-summary/`).then(r => r.json()).then(setKpi).catch(console.error)
    fetch(`${API_BASE}/api/news-sentiment-trend/`).then(r => r.json()).then(setSentimentTrend).catch(console.error)
  }, [])

  useEffect(() => {
    const url = selectedKeyword
      ? `${API_BASE}/api/news-articles/?keyword=${encodeURIComponent(selectedKeyword)}`
      : `${API_BASE}/api/news-articles/`
    fetch(url).then(r => r.json()).then(a => setArticles(dedupeArticles(a))).catch(console.error)
  }, [selectedKeyword])

  if (!kpi) {
    return (
      <div className="news-slide">
        <div className="layer-pending">
          <span className="layer-pending-icon">📡</span>
          <div className="layer-pending-title">Loading live intelligence…</div>
        </div>
      </div>
    )
  }

  const byKeyword = {}
  sentimentTrend.forEach(row => {
    if (!byKeyword[row.keyword] || row.sentiment_date > byKeyword[row.keyword].sentiment_date) byKeyword[row.keyword] = row
  })
  const ranked = Object.values(byKeyword).filter(k => k.mention_count > 0)
    .sort((a, b) => b.mention_count - a.mention_count).slice(0, isMobile ? 10 : 16)
  const topSignals = ranked.slice(0, 6)
  const bubbleData = ranked.map(k => ({ name: k.keyword, value: k.mention_count, sentiment: k.weighted_sentiment }))

  const bySentiment = [...ranked].filter(k => k.mention_count >= 2)
  const mostPositive = [...bySentiment].sort((a, b) => b.weighted_sentiment - a.weighted_sentiment)[0]
  const mostNegative = [...bySentiment].sort((a, b) => a.weighted_sentiment - b.weighted_sentiment)[0]

  const positiveCount = ranked.filter(k => k.weighted_sentiment > 0.15).length
  const negativeCount = ranked.filter(k => k.weighted_sentiment < -0.15).length
  const insightText = ranked.length > 0
    ? `${ranked[0].keyword} leads this week's coverage with ${ranked[0].mention_count} mentions. Across the ${ranked.length} most-discussed topics, ${positiveCount} lean positive and ${negativeCount} lean negative — the rest read as mixed or neutral.`
    : ''

  return (
    <div className="news-slide">
      <div className="news-signals-row">
        <span className="news-signals-label">Top signals today</span>
        <div className="news-signals-pills">
          {topSignals.map((k, i) => (
            <span key={i} className="news-signal-pill" style={{ borderColor: sentimentColor(k.weighted_sentiment) }}>
              {k.keyword}
            </span>
          ))}
        </div>
      </div>

      <div className="news-kpi-row">
        <div className="news-kpi-tile">
          <span className="news-kpi-tile-label">Articles</span>
          <span className="news-kpi-tile-value">{kpi.total_articles}</span>
        </div>
        <div className="news-kpi-tile">
          <span className="news-kpi-tile-label">Top Topic</span>
          <span className="news-kpi-tile-value news-kpi-tile-value-text">{kpi.top_keyword?.keyword}</span>
        </div>
        <div className="news-kpi-tile news-kpi-tile-gauge">
          <span className="news-kpi-tile-label">Sentiment</span>
          <SentimentGauge score={kpi.overall_sentiment} />
        </div>
        {mostPositive && (
          <div className="news-kpi-tile">
            <span className="news-kpi-tile-label">Most Positive</span>
            <span className="news-kpi-tile-value news-kpi-tile-value-text" style={{ color: SENTIMENT_COLORS.positive }}>
              {mostPositive.keyword}
            </span>
            <span className="news-kpi-tile-sublabel">among topics with 2+ mentions</span>
          </div>
        )}
        {mostNegative && (
          <div className="news-kpi-tile">
            <span className="news-kpi-tile-label">Most Negative</span>
            <span className="news-kpi-tile-value news-kpi-tile-value-text" style={{ color: SENTIMENT_COLORS.negative }}>
              {mostNegative.keyword}
            </span>
            <span className="news-kpi-tile-sublabel">among topics with 2+ mentions</span>
          </div>
        )}
      </div>

      <div className="news-main-grid">
        <div className="news-wire">
          <div className="news-wire-header">
            <span>Live Wire</span>
            {selectedKeyword && <button className="news-wire-clear" onClick={() => setSelectedKeyword(null)}>× {selectedKeyword}</button>}
          </div>
          <div className="news-wire-timeline">
            {articles.map((a, i) => {
              const isOpen = expandedIdx === i
              return (
                <div key={i} className="news-wire-row">
                  <div className="news-wire-rail">
                    <span className="news-wire-dot" style={{ background: sentimentColor(a.sentiment_score - 0.5) }}></span>
                    {i < articles.length - 1 && <span className="news-wire-line"></span>}
                  </div>
                  <div className="news-wire-item" onClick={() => setExpandedIdx(isOpen ? null : i)}>
                    <div className="news-wire-item-head">
                      <span className="news-wire-title">{a.title}</span>
                      <span className={`news-wire-caret ${isOpen ? 'news-wire-caret-open' : ''}`}>▾</span>
                    </div>
                    <div className="news-wire-meta">
                      <span className="news-wire-keyword-pill">{a.matched_keyword}</span>
                      <span>{a.sources.length > 1 ? `${a.sources.length} sources` : a.source_domain} · {timeAgo(a.published_at)}</span>
                    </div>
                    {isOpen && (
                      <div className="news-wire-expand">
                        {a.description && <p className="news-wire-desc">{a.description}</p>}
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="news-wire-readmore">
                          Read full article →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="news-bubble-panel">
          <div className="news-bubble-header">Most-discussed topics</div>
          <div className="news-bubble-desc">Circle size = article volume · color intensity = sentiment strength, last 7 days</div>
          <BubbleChart data={bubbleData} width={isMobile ? 300 : 380} height={isMobile ? 220 : 260} onSelect={setSelectedKeyword} highlightNames={[mostPositive?.keyword, mostNegative?.keyword].filter(Boolean)} />
          <div className="news-bubble-legend">
            <span className="news-bubble-legend-item"><span className="news-bubble-legend-dot" style={{ background: SENTIMENT_COLORS.positive }}></span>Positive</span>
            <span className="news-bubble-legend-item"><span className="news-bubble-legend-dot" style={{ background: '#D14545' }}></span>Negative</span>
            <span className="news-bubble-legend-item"><span className="news-bubble-legend-dot" style={{ background: 'var(--muted)' }}></span>Mixed</span>
          </div>
          {insightText && <p className="news-bubble-insight">{insightText}</p>}
        </div>
      </div>
    </div>
  )
}

export default NewsIntelligenceSlide