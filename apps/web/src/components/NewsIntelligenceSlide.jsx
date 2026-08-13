import { useState, useEffect } from 'react'
import { hierarchy, pack } from 'd3-hierarchy'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const CATEGORY_ICONS = {
  'Orchestration': '🔀', 'Processing': '⚡', 'Streaming': '🌊', 'Warehouse': '🏔️',
  'Database': '🗄️', 'Data Quality': '✅', 'BI': '📊', 'Cloud Platform': '☁️',
  'AI-DE Crossover': '🤖', 'Broader Concept': '💡',
}

const TECH_ICON_SLUGS = {
  'Apache Airflow': 'apacheairflow', 'dbt': 'dbt', 'Dagster': 'dagster', 'Prefect': 'prefect',
  'Apache Spark': 'apachespark', 'Apache Flink': 'apacheflink', 'PySpark': 'apachespark',
  'Apache Kafka': 'apachekafka', 'Apache Airbyte': 'airbyte',
  'Snowflake': 'snowflake', 'Databricks': 'databricks', 'Google BigQuery': 'googlebigquery',
  'Amazon Redshift': 'amazonredshift', 'DuckDB': 'duckdb', 'ClickHouse': 'clickhouse',
  'Trino': 'trino', 'PostgreSQL': 'postgresql', 'MySQL': 'mysql', 'MongoDB': 'mongodb',
  'Redis': 'redis', 'Apache Cassandra': 'apachecassandra', 'Elasticsearch': 'elasticsearch',
  'MariaDB': 'mariadb', 'CockroachDB': 'cockroachlabs',
  'Apache Superset': 'apachesuperset', 'Grafana': 'grafana', 'Looker': 'looker',
  'Tableau': 'tableau', 'Power BI': 'powerbi', 'Metabase': 'metabase',
  'AWS Glue': 'amazonaws', 'Azure Data Factory': 'microsoftazure', 'Microsoft Fabric': 'microsoftazure',
  'Azure Synapse': 'microsoftazure', 'Google Cloud Dataflow': 'googlecloud',
  'LangChain': 'langchain', 'MLflow': 'mlflow', 'Qdrant': 'qdrant', 'pgvector': 'postgresql',
}

// Theme-consistent sentiment colors: positive ties directly to the site's
// own teal accent, neutral uses the site's own muted gray - only negative
// is a new color, kept because red-for-negative is a universal, functional
// convention worth preserving regardless of theme.
const NEGATIVE_COLOR = '#D14545'

function sentimentColor(score) {
  if (score > 0.15) return 'var(--accent2)'
  if (score < -0.15) return NEGATIVE_COLOR
  return 'var(--muted)'
}
function sentimentLabel(score) {
  if (score > 0.15) return 'leaning positive'
  if (score < -0.15) return 'leaning negative'
  return 'mixed / neutral'
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

function TechIcon({ keyword, category, size = 16 }) {
  const slug = TECH_ICON_SLUGS[keyword]
  const [failed, setFailed] = useState(false)
  if (!slug || failed) return <span style={{ fontSize: size }}>{CATEGORY_ICONS[category] || '📌'}</span>
  return (
    <img src={`https://cdn.simpleicons.org/${slug}`} alt="" width={size} height={size}
         style={{ objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }}
         onError={() => setFailed(true)} />
  )
}

function BubbleIcon({ keyword, category, x, y, size }) {
  const slug = TECH_ICON_SLUGS[keyword]
  const [failed, setFailed] = useState(false)
  if (!slug || failed) {
    return <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.7}>{CATEGORY_ICONS[category] || '📌'}</text>
  }
  return <image href={`https://cdn.simpleicons.org/${slug}/ffffff`} x={x - size / 2} y={y - size / 2} width={size} height={size} onError={() => setFailed(true)} />
}

function BubbleChart({ data, width, height, onSelect }) {
  const root = hierarchy({ children: data }).sum(d => d.value)
  const packLayout = pack().size([width, height]).padding(5)
  const leaves = packLayout(root).leaves()

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {leaves.map((leaf, i) => {
        const color = sentimentColor(leaf.data.sentiment)
        const showLabel = leaf.r > 26
        const showIcon = leaf.r > 16
        return (
          <g key={i} onClick={() => onSelect(leaf.data.name)} style={{ cursor: 'pointer' }}>
            <circle cx={leaf.x} cy={leaf.y} r={leaf.r} fill={color} fillOpacity={0.85} stroke="var(--bg-alt)" strokeWidth={2.5} />
            {showIcon && (
              <BubbleIcon keyword={leaf.data.name} category={leaf.data.category} x={leaf.x}
                          y={showLabel ? leaf.y - leaf.r * 0.28 : leaf.y} size={Math.min(leaf.r * 0.6, 22)} />
            )}
            {showLabel && (
              <text x={leaf.x} y={leaf.y + leaf.r * 0.45} textAnchor="middle"
                    fontSize={Math.min(leaf.r * 0.22, 12)} fill="#fff" fontWeight={700}>
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

  const keywordMeta = {}
  const byKeyword = {}
  sentimentTrend.forEach(row => {
    keywordMeta[row.keyword] = row.category
    if (!byKeyword[row.keyword] || row.sentiment_date > byKeyword[row.keyword].sentiment_date) byKeyword[row.keyword] = row
  })
  const ranked = Object.values(byKeyword).filter(k => k.mention_count > 0)
    .sort((a, b) => b.mention_count - a.mention_count).slice(0, isMobile ? 10 : 16)
  const topSignals = ranked.slice(0, 6)
  const bubbleData = ranked.map(k => ({ name: k.keyword, value: k.mention_count, sentiment: k.weighted_sentiment, category: k.category }))

  return (
    <div className="news-slide">
      <div className="news-signals-row">
        <span className="news-signals-label">Top signals today</span>
        <div className="news-signals-pills">
          {topSignals.map((k, i) => (
            <span key={i} className="news-signal-pill">
              <TechIcon keyword={k.keyword} category={k.category} size={13} /> {k.keyword}
              <span className="news-signal-dot" style={{ background: sentimentColor(k.weighted_sentiment) }}></span>
            </span>
          ))}
        </div>
      </div>

      <div className="news-kpi-row">
        <div className="news-kpi-tile">
          <span className="news-kpi-tile-icon">📰</span>
          <span className="news-kpi-tile-label">Articles tracked, last 7 days</span>
          <span className="news-kpi-tile-value">{kpi.total_articles}</span>
        </div>
        <div className="news-kpi-tile">
          <span className="news-kpi-tile-icon"><TechIcon keyword={kpi.top_keyword?.keyword} category={keywordMeta[kpi.top_keyword?.keyword]} size={18} /></span>
          <span className="news-kpi-tile-label">Most-covered topic this week</span>
          <span className="news-kpi-tile-value news-kpi-tile-value-text">{kpi.top_keyword?.keyword}</span>
        </div>
        <div className="news-kpi-tile">
          <span className="news-kpi-tile-icon">🎭</span>
          <span className="news-kpi-tile-label">News sentiment, last 7 days</span>
          <div className="news-gauge-track">
            <div className="news-gauge-fill" style={{
              width: `${Math.max(0, Math.min(100, ((kpi.overall_sentiment + 1) / 2) * 100))}%`,
              background: sentimentColor(kpi.overall_sentiment)
            }}></div>
          </div>
          <span className="news-kpi-tile-sub" style={{ color: sentimentColor(kpi.overall_sentiment) }}>
            Coverage is {sentimentLabel(kpi.overall_sentiment)}
          </span>
        </div>
      </div>

      <div className="news-main-grid">
        <div className="news-wire">
          <div className="news-wire-header">
            <span>📰 Live Wire</span>
            {selectedKeyword && <button className="news-wire-clear" onClick={() => setSelectedKeyword(null)}>× {selectedKeyword}</button>}
          </div>
          <div className="news-wire-feed">
            {articles.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="news-wire-card">
                <div className="news-wire-avatar">
                  <TechIcon keyword={a.matched_keyword} category={keywordMeta[a.matched_keyword]} size={20} />
                </div>
                <div className="news-wire-content">
                  <div className="news-wire-title">{a.title}</div>
                  <div className="news-wire-meta">
                    <span className="news-wire-keyword-pill">{a.matched_keyword}</span>
                    <span>{a.sources.length > 1 ? `${a.sources.length} sources` : a.source_domain} · {timeAgo(a.published_at)}</span>
                  </div>
                </div>
                <span className="news-wire-sentiment-dot" style={{ background: sentimentColor(a.sentiment_score - 0.5) }}></span>
              </a>
            ))}
          </div>
        </div>

        <div className="news-bubble-panel">
          <div className="news-bubble-header">Most-discussed topics</div>
          <div className="news-bubble-desc">Bubble size = article volume, color = coverage tone, last 7 days</div>
          <BubbleChart data={bubbleData} width={isMobile ? 300 : 380} height={isMobile ? 240 : 300} onSelect={setSelectedKeyword} />
          <div className="news-bubble-legend">
            <div className="news-bubble-legend-title">How to read this</div>
            <div className="news-bubble-legend-row">
              <span className="news-bubble-legend-dot" style={{ background: 'var(--accent2)' }}></span>
              Positive coverage
              <span className="news-bubble-legend-dot" style={{ background: NEGATIVE_COLOR }}></span>
              Negative coverage
              <span className="news-bubble-legend-dot" style={{ background: 'var(--muted)' }}></span>
              Mixed / neutral
            </div>
            <p className="news-bubble-legend-text">
              Each bubble is a tracked technology or topic. Bigger bubbles mean more news coverage this week; color shows whether that coverage has leaned positive, negative, or mixed. Click any bubble to filter the Live Wire feed to just that topic.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewsIntelligenceSlide