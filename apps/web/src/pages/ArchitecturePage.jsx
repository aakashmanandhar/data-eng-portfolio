import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, Github, Globe2, History, Package, Newspaper, Bot, TrendingUp,
  ChevronDown, Clock, Zap, Database, Server, Layers, ShieldCheck, Sparkles
} from 'lucide-react'
import '../App.css'

const stack = [
  'Django', 'Django REST Framework', 'React', 'PostgreSQL', 'pgvector',
  'dbt', 'Terraform', 'Docker', 'Jenkins', 'Apache Airflow', 'Nginx', 'Cloudflare',
  'Google Gemini API', 'Adzuna API', 'GitHub API', 'Stack Overflow Developer Survey',
  'scikit-learn', 'react-leaflet', 'Recharts', 'OSS Insight API', 'Practical Data Community Survey',
  'ai-jobs-net-salaries', 'Currents API', 'Hugging Face Transformers', 'arXiv API',
  'Semantic Scholar API', 'OpenAlex API', 'Crossref API', 'DBLP API', 'Zenodo API'
]

const PIPELINES = [
  {
    id: 'jobmarket',
    title: 'Job Market & Tools Explorer',
    tagline: 'The project that started it all — real salary and hiring data across 20 countries.',
    Icon: DollarSign,
    color: '#2563EB',
    orchestrator: 'Jenkins',
    schedule: 'Every 6 hours',
    sources: [
      { name: 'Adzuna API', detail: 'salary histograms + job counts, 19 countries' },
      { name: 'Stack Overflow Developer Survey', detail: 'tool usage + self-reported salary' },
    ],
    warehouse: 'dim_country, dim_tool → fact_job_market, fact_tool_preference_global',
    note: 'The dedicated dashboard for this pipeline was retired — its data is still live and queryable, just through the RAG assistant now rather than a standalone UI.',
  },
  {
    id: 'github',
    title: 'GitHub Trends',
    tagline: 'Tracking the real shift toward AI-native data engineering tooling, daily.',
    Icon: Github,
    color: '#16A34A',
    orchestrator: 'Apache Airflow',
    schedule: 'Daily · shared DAG',
    sources: [
      { name: 'GitHub API', detail: '122 tracked repos across 11 cohorts (traditional vs. AI-native)' },
    ],
    warehouse: 'dim_github_repo, dim_github_org → fact_github_repo_trend (LAG() growth)',
    note: 'Two orchestrators, deliberately — Airflow proves genuine parallel fan-out/fan-in scheduling alongside Jenkins\' simple linear cron.',
  },
  {
    id: 'gis',
    title: 'Interactive AI/ML GIS Map',
    tagline: 'A choropleth map of where the AI-native shift is actually happening, geographically.',
    Icon: Globe2,
    color: '#0D9488',
    orchestrator: 'Apache Airflow',
    schedule: 'Daily · shares GitHub Trends DAG',
    sources: [
      { name: 'OSS Insight API', detail: 'per-country stargazer breakdown, ~122 repos' },
    ],
    warehouse: 'fact_country_ai_signal, fact_country_tool_signal, dim_country_archetype',
    note: 'Built entirely on top of GitHub Trends\' own repo universe — no new API scope, just a new lens on existing data.',
  },
  {
    id: 'survey',
    title: 'Historical Survey Analytics',
    tagline: 'A full decade of Stack Overflow tool-adoption data, plus a 2026 industry survey.',
    Icon: History,
    color: '#7C3AED',
    orchestrator: 'Apache Airflow',
    schedule: 'Manual-trigger only',
    sources: [
      { name: 'SO Developer Survey (Historical)', detail: '2016-2025, 720,140 respondents, 3 harmonized naming eras' },
      { name: 'Practical Data Community Survey', detail: '2026 snapshot, 1,101 respondents' },
    ],
    warehouse: 'fact_de_tool_by_country_year, fact_de_tool_ranking',
    note: 'Deliberately not on a live schedule — neither source has a public API, so a human downloads new data first, then this DAG handles everything after that.',
  },
  {
    id: 'oss',
    title: 'OSS Ecosystem Landscape',
    tagline: 'Org leaderboard, tool co-adoption clustering, hype-vs-reality gap, lifecycle staging.',
    Icon: Package,
    color: '#D97706',
    orchestrator: 'Apache Airflow',
    schedule: 'Daily · shares GitHub Trends DAG',
    sources: [
      { name: 'GitHub Trends\' own repo universe', detail: 'no new orchestration, reuses Pipeline 2\'s data' },
    ],
    warehouse: 'derived analytics on top of dim_github_repo / fact_github_repo_trend',
    note: 'k-means cluster IDs aren\'t stable across runs — real bug found and fixed with anchor-repo detection instead of a fragile fixed-ID mapping.',
  },
  {
    id: 'salary',
    title: 'Salary & Career Intelligence',
    tagline: 'A live salary predictor, real forecasting, and career clustering from 151,445 respondents.',
    Icon: TrendingUp,
    color: '#DB2777',
    orchestrator: 'Apache Airflow',
    schedule: 'Weekly · own dedicated DAG',
    sources: [
      { name: 'ai-jobs-net-salaries', detail: 'weekly-updated public GitHub dataset, 2021-2025+' },
    ],
    warehouse: 'fact_salary_by_experience, fact_salary_by_tool, fact_remote_ratio_trend, fact_top_paying_title_by_year',
    note: 'The predictor\'s first model was honest but weak (R²=0.109) — adding job_title as a feature more than doubled accuracy to R²=0.2475.',
  },
  {
    id: 'news',
    title: 'News & Sentiment Intelligence',
    tagline: 'Real-time sentiment scoring on data engineering news and discussion.',
    Icon: Newspaper,
    color: '#F97316',
    orchestrator: 'Apache Airflow',
    schedule: 'Daily · shared DAG',
    sources: [
      { name: 'Currents API', detail: '70-term curated DE/AI-DE keyword sweep' },
    ],
    warehouse: 'dim_keyword, dim_source → fact_keyword_mention, fact_keyword_sentiment_trend',
    note: 'Sentiment scored via a real Hugging Face transformer (cardiffnlp/twitter-roberta-base-sentiment-latest), confidence-weighted.',
  },
  {
    id: 'research',
    title: 'AI & Data Engineering Research',
    tagline: 'The newest and most feature-dense — a self-healing pipeline across 9 real academic sources.',
    Icon: Bot,
    color: '#4F46E5',
    orchestrator: 'Apache Airflow',
    schedule: 'Daily · own dedicated DAG (19 tasks)',
    sources: [
      { name: 'arXiv, Semantic Scholar, OpenAlex, Crossref, DBLP, Hugging Face Papers, Zenodo', detail: '93-keyword DE/AI-DE sweep across all 7' },
      { name: 'GitHub + Hacker News', detail: 'tooling and discussion signal' },
    ],
    warehouse: 'dim_research_source (9 rows), fact_research_signal (UNION ALL 9), fact_tool_adoption',
    note: 'The most significant bug in the whole platform: sorting all 9 sources by recency alone starved 5 of them to zero representation. Fixed with fair per-source sampling.',
  },
]

const ML_MODELS = [
  ['AI Adoption Forecast', 'GitHub + arXiv + HN, LinearRegression', 'Forecasts AI tool adoption'],
  ['DE Tool Forecast', '10yr SO Survey, per-country + overall', 'Forecasts DE tool usage'],
  ['Tool Momentum Staging', 'Emerging/Accelerating/Mature/Declining', 'Stages tools by lifecycle'],
  ['3-Year Salary Forecast', 'Real statistical prediction intervals', 'Forecasts salary trends'],
  ['7-Day Research Forecast', 'LinearRegression, daily paper volume', 'Predicts daily paper volume'],
  ['Country AI Archetypes', 'k-means, 4 clusters', 'Clusters countries by AI maturity'],
  ['Org Maturity Clustering', 'k-means, 4 archetypes', 'Clusters organizations'],
  ['Career Fit Recommender', 'Growth + salary joined', 'Recommends best-fit careers'],
  ['Career Archetype Clustering', 'k-means, 93 job titles', 'Groups similar job roles'],
  ['Growth Forecast', 'Per-country LinearRegression', 'Forecasts country growth'],
  ['Tool Co-Adoption Clustering', 'k-means on country pattern', 'Finds co-adoption patterns'],
  ['Skill Growth Ranking', 'Per-tool salary regression slope', 'Ranks skills by growth'],
  ['Live Salary Predictor', 'RandomForest, real-time inputs', 'Predicts live salaries'],
  ['Sentiment Scoring', 'HF transformer, confidence-weighted', 'Real-time sentiment scoring'],
  ['Keyword Growth/Breakout Detection', 'Honestly-gated, threshold-based', 'Detects real breakouts, not noise'],
]

function PipelineCard({ pipeline, isOpen, onToggle }) {
  const { Icon, color } = pipeline
  return (
    <div className="arch-pipeline-card" style={isOpen ? { borderColor: color } : {}}>
      <button className="arch-pipeline-header" onClick={onToggle}>
        <span className="arch-pipeline-icon" style={{ background: `${color}22`, color }}>
          <Icon size={18} />
        </span>
        <div className="arch-pipeline-header-text">
          <span className="arch-pipeline-title">{pipeline.title}</span>
          <span className="arch-pipeline-tagline">{pipeline.tagline}</span>
        </div>
        <ChevronDown size={18} className={`arch-pipeline-chevron ${isOpen ? 'arch-pipeline-chevron-open' : ''}`} />
      </button>
      {isOpen && (
        <div className="arch-pipeline-body">
          <div className="arch-pipeline-meta-row">
            <span className="arch-pipeline-meta"><Clock size={12} /> {pipeline.orchestrator} · {pipeline.schedule}</span>
          </div>
          <div className="arch-pipeline-section">
            <span className="arch-pipeline-section-label"><Database size={12} /> Sources</span>
            {pipeline.sources.map((s, i) => (
              <div key={i} className="arch-pipeline-source">
                <strong>{s.name}</strong> — {s.detail}
              </div>
            ))}
          </div>
          <div className="arch-pipeline-section">
            <span className="arch-pipeline-section-label"><Layers size={12} /> Warehouse</span>
            <div className="arch-pipeline-source">{pipeline.warehouse}</div>
          </div>
          <div className="arch-pipeline-note">
            <Sparkles size={12} /> {pipeline.note}
          </div>
        </div>
      )}
    </div>
  )
}

function ArchitecturePage() {
  const [openId, setOpenId] = useState('research')

  return (
    <div className="detail-page">
      <Link to="/" className="back-link">← Back to portfolio</Link>
      <h1>How This Site Works</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14.5px', lineHeight: 1.7, marginBottom: '24px' }}>
        This portfolio isn't just a static page describing my work — it's a live, self-hosted data platform
        running eight independently-orchestrated pipelines, 15+ real trained ML models, 2 self-healing AI
        agents, and one RAG assistant grounded in all of it. Here's the architecture behind every piece.
      </p>

      <div className="arch-stats-row">
        <div className="arch-stat"><Server size={16} color="var(--accent1)" /><div><span className="arch-stat-value">8</span><span className="arch-stat-label">Pipelines</span></div></div>
        <div className="arch-stat"><Zap size={16} color="#D97706" /><div><span className="arch-stat-value">4</span><span className="arch-stat-label">Orchestration Schedules</span></div></div>
        <div className="arch-stat"><TrendingUp size={16} color="#16A34A" /><div><span className="arch-stat-value">15+</span><span className="arch-stat-label">ML Models</span></div></div>
        <div className="arch-stat"><ShieldCheck size={16} color="#7C3AED" /><div><span className="arch-stat-value">2</span><span className="arch-stat-label">Self-Healing Agents</span></div></div>
      </div>

      <h2 style={{ fontSize: '18px', marginTop: '30px', marginBottom: '14px' }}>The 8 Pipelines</h2>
      <div className="arch-pipeline-list">
        {PIPELINES.map((p) => (
          <PipelineCard key={p.id} pipeline={p} isOpen={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />
        ))}
      </div>

      <h2 style={{ fontSize: '18px', marginTop: '34px', marginBottom: '14px' }}>ML & Analytics Layer — 15+ real models</h2>
      <div className="arch-model-table">
        <div className="arch-model-row arch-model-header">
          <span>Model</span>
          <span>Technique</span>
          <span>What It Does</span>
        </div>
        {ML_MODELS.map(([name, tech, desc], i) => (
          <div key={i} className="arch-model-row">
            <span className="arch-model-name">{name}</span>
            <span className="arch-model-tech">{tech}</span>
            <span className="arch-model-desc">{desc}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '18px', marginTop: '34px', marginBottom: '10px' }}>Why these choices</h2>
      <div style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.8 }}>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>ELT over ETL:</strong> raw data lands untouched in Postgres first (bronze),
          and all transformation logic lives in version-controlled dbt models — so the source of truth is always inspectable,
          and transformations can be rebuilt without re-fetching from source APIs.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Medallion architecture:</strong> bronze/silver/gold schemas separate raw ingestion,
          cleaning, and business-ready star-schema modeling — each layer testable independently via dbt tests.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Four orchestration schedules, deliberately:</strong> Jenkins for the job-market
          pipeline's simple linear cron (every 6 hours), one shared Airflow DAG for GitHub Trends/GIS Map/OSS Landscape/News
          Intelligence (daily, genuine parallel fan-out/fan-in), Salary's own dedicated weekly DAG (matching its real update
          cadence), and the AI & DE Research pipeline's own dedicated daily DAG (19 tasks, not shared with anything else).
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Self-hosted, not managed:</strong> every piece — Postgres, Jenkins, Airflow,
          Django, React, dbt — runs in Docker on a single VPS I administer directly, giving full control over cost and
          configuration at the expense of the convenience managed services provide.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>RAG grounded in real data:</strong> the chat assistant routes questions
          to either live SQL over all eight pipelines' gold schemas or vector retrieval over embedded case study content — it's
          built to say "I don't know" rather than hallucinate when source material doesn't cover something.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Honest data-sufficiency gates, everywhere:</strong> every forecast model
          in this system reports "insufficient_data" below a real threshold rather than fabricating a confident trend from
          too few points — the same discipline that also drives the two self-healing AI agents to log honestly, even when
          their log is empty because nothing's gone wrong yet.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Cluster IDs are not stable — name by content, not position:</strong> a real
          bug found via testing against the server's independently-accumulated data: k-means assigns numeric cluster IDs
          arbitrarily, so the same semantic group can get a different ID from one run to the next. Every clustering model
          here names clusters by inspecting real anchor members or centroid characteristics, never by a fixed ID mapping.
        </p>
        <p>
          <strong style={{ color: 'var(--text)' }}>Fair sampling over naive sorting:</strong> the newest lesson, from the
          research pipeline — sorting 9 sources together by a shared "recency" field looked correct until it silently
          starved sources whose date semantics differ. The fix generalizes: never trust one shared sort order across
          genuinely heterogeneous sources.
        </p>
      </div>

      <h2 style={{ fontSize: '18px', marginTop: '30px', marginBottom: '14px' }}>Full stack</h2>
      <div className="pills">
        {stack.map((tech) => (
          <span className="pill" key={tech}>{tech}</span>
        ))}
      </div>
    </div>
  )
}

export default ArchitecturePage
