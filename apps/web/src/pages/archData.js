import {
  DollarSign, Github, Globe2, History, Package, Newspaper, Bot, TrendingUp,
  Cloud, Workflow, Database, Sparkles, Layers, Server, MonitorSmartphone,
  LineChart, Boxes, Gauge, MessageSquareText, Target, ShieldCheck, Shuffle, Scale, Container
} from 'lucide-react'

export const SECTIONS = [
  { id: 'flow', label: 'Data flow' },
  { id: 'pipelines', label: 'Pipelines' },
  { id: 'models', label: 'ML models' },
  { id: 'principles', label: 'Design choices' },
  { id: 'stack', label: 'Tech stack' },
]

export const STATS = [
  { value: 8, suffix: '', label: 'Pipelines', icon: Workflow, color: '#2563EB' },
  { value: 4, suffix: '', label: 'Orchestration schedules', icon: Gauge, color: '#D97706' },
  { value: 15, suffix: '+', label: 'Trained ML models', icon: LineChart, color: '#16A34A' },
  { value: 2, suffix: '', label: 'Self-healing agents', icon: ShieldCheck, color: '#7C3AED' },
]

export const FLOW = [
  {
    id: 'sources', title: 'Sources', short: '9+ APIs & datasets', icon: Cloud, color: '#0EA5E9',
    text: 'Public APIs and downloadable datasets: job listings, GitHub activity, developer surveys, news and nine academic sources. Each one has its own cadence, auth and failure modes.',
    points: ['Adzuna, GitHub, OSS Insight, Currents', 'Stack Overflow survey, community survey, salary dataset', 'arXiv, Semantic Scholar, OpenAlex, Crossref, DBLP, Hugging Face Papers, Zenodo'],
    chips: ['REST APIs', 'CSV / Parquet', 'Rate limits', 'Retries'],
  },
  {
    id: 'orchestrate', title: 'Orchestrate', short: 'Airflow · Jenkins', icon: Workflow, color: '#F59E0B',
    text: 'Four deliberate schedules: Jenkins for the simple linear cron, one shared Airflow DAG with parallel fan-out and fan-in, a weekly salary DAG, and a dedicated 19-task research DAG.',
    points: ['Jenkins: every 6 hours', 'Airflow shared DAG: daily, parallel tasks', 'Salary DAG: weekly · Research DAG: daily'],
    chips: ['Apache Airflow', 'Jenkins', 'Docker', 'Cron'],
  },
  {
    id: 'bronze', title: 'Bronze', short: 'Raw, untouched', icon: Database, color: '#B45309',
    text: 'Raw data lands untouched in PostgreSQL first. The source of truth stays inspectable, and anything downstream can be rebuilt without calling the source APIs again.',
    points: ['ELT, not ETL', 'Append-only raw tables', 'Re-runnable without re-fetching'],
    chips: ['PostgreSQL', 'Raw schemas'],
  },
  {
    id: 'silver', title: 'Silver', short: 'Cleaned & typed', icon: Sparkles, color: '#64748B',
    text: 'dbt staging models clean, type and de-duplicate. Naming eras in the survey data are harmonised here so ten years of answers can be compared.',
    points: ['Version-controlled SQL in dbt', 'Harmonised naming across survey eras', 'dbt tests on every model'],
    chips: ['dbt', 'Staging models', 'dbt tests'],
  },
  {
    id: 'gold', title: 'Gold', short: 'Star schemas + ML', icon: Layers, color: '#EAB308',
    text: 'Business-ready star schemas, plus the output of 15+ trained models: forecasts, clusters and rankings. Every forecast reports insufficient_data below a real threshold instead of faking a trend.',
    points: ['dim_ and fact_ tables per pipeline', 'scikit-learn and Hugging Face models', 'Honest data-sufficiency gates'],
    chips: ['Star schema', 'scikit-learn', 'Transformers', 'pgvector'],
  },
  {
    id: 'serve', title: 'Serve', short: 'Django API + RAG', icon: Server, color: '#16A34A',
    text: 'Django REST Framework exposes the gold layer. The RAG assistant routes each question to live SQL over the gold schemas or to vector retrieval over embedded case-study content, and says "I don\'t know" when neither covers it.',
    points: ['REST endpoints per pipeline', 'SQL routing + vector retrieval', 'Gemini for answers'],
    chips: ['Django', 'DRF', 'pgvector', 'Gemini API'],
  },
  {
    id: 'experience', title: 'Experience', short: 'React dashboards', icon: MonitorSmartphone, color: '#7C3AED',
    text: 'A React app turns it into something you can explore: an interactive globe, forecasts, salary tools, a research feed and the chat assistant.',
    points: ['Interactive d3 globe', 'Recharts dashboards', 'Chat assistant'],
    chips: ['React', 'Vite', 'd3-geo', 'Recharts', 'Nginx', 'Cloudflare'],
  },
]
export const GROUPS = [
  { id: 'all', label: 'All' },
  { id: 'jenkins', label: 'Jenkins' },
  { id: 'shared', label: 'Airflow · shared DAG' },
  { id: 'dedicated', label: 'Airflow · dedicated DAG' },
  { id: 'manual', label: 'Manual trigger' },
]

export const PIPELINES = [
  {
    id: 'jobmarket', group: 'jenkins', title: 'Job Market & Tools Explorer',
    tagline: 'The project that started it all: real salary and hiring data across 20 countries.',
    Icon: DollarSign, color: '#2563EB', orchestrator: 'Jenkins', schedule: 'Every 6 hours',
    sources: [
      { name: 'Adzuna API', detail: 'salary histograms + job counts, 19 countries' },
      { name: 'Stack Overflow Developer Survey', detail: 'tool usage + self-reported salary' },
    ],
    tables: ['dim_country', 'dim_tool', 'fact_job_market', 'fact_tool_preference_global'],
    note: 'The dedicated dashboard for this pipeline was retired. Its data is still live and queryable, just through the RAG assistant now rather than a standalone UI.',
  },
  {
    id: 'github', group: 'shared', title: 'GitHub Trends',
    tagline: 'Tracking the real shift toward AI-native data engineering tooling, daily.',
    Icon: Github, color: '#16A34A', orchestrator: 'Apache Airflow', schedule: 'Daily · shared DAG',
    sources: [{ name: 'GitHub API', detail: '122 tracked repos across 11 cohorts (traditional vs. AI-native)' }],
    tables: ['dim_github_repo', 'dim_github_org', 'fact_github_repo_trend'],
    note: 'Two orchestrators, deliberately. Airflow proves genuine parallel fan-out/fan-in scheduling alongside Jenkins\' simple linear cron.',
  },
  {
    id: 'gis', group: 'shared', title: 'Interactive AI/ML GIS Map',
    tagline: 'A globe of where the AI-native shift is actually happening, geographically.',
    Icon: Globe2, color: '#0D9488', orchestrator: 'Apache Airflow', schedule: 'Daily · shares the GitHub Trends DAG',
    sources: [{ name: 'OSS Insight API', detail: 'per-country stargazer breakdown, ~122 repos' }],
    tables: ['fact_country_ai_signal', 'fact_country_tool_signal', 'dim_country_archetype'],
    note: 'Built entirely on top of GitHub Trends\' own repo universe. No new API scope, just a new lens on existing data.',
  },
  {
    id: 'survey', group: 'manual', title: 'Historical Survey Analytics',
    tagline: 'A full decade of Stack Overflow tool-adoption data, plus a 2026 industry survey.',
    Icon: History, color: '#7C3AED', orchestrator: 'Apache Airflow', schedule: 'Manual trigger only',
    sources: [
      { name: 'SO Developer Survey (Historical)', detail: '2016-2025, 720,140 respondents, 3 harmonised naming eras' },
      { name: 'Practical Data Community Survey', detail: '2026 snapshot, 1,101 respondents' },
    ],
    tables: ['fact_de_tool_by_country_year', 'fact_de_tool_ranking'],
    note: 'Deliberately not on a live schedule. Neither source has a public API, so a human downloads new data first, then this DAG handles everything after that.',
  },
  {
    id: 'oss', group: 'shared', title: 'OSS Ecosystem Landscape',
    tagline: 'Org leaderboard, tool co-adoption clustering, hype-vs-reality gap, lifecycle staging.',
    Icon: Package, color: '#D97706', orchestrator: 'Apache Airflow', schedule: 'Daily · shares the GitHub Trends DAG',
    sources: [{ name: 'GitHub Trends\' own repo universe', detail: 'no new orchestration, reuses the GitHub pipeline\'s data' }],
    tables: ['dim_github_repo', 'fact_github_repo_trend'],
    note: 'k-means cluster IDs aren\'t stable across runs. A real bug, fixed with anchor-repo detection instead of a fragile fixed-ID mapping.',
  },
  {
    id: 'salary', group: 'dedicated', title: 'Salary & Career Intelligence',
    tagline: 'A live salary predictor, real forecasting, and career clustering from 151,445 respondents.',
    Icon: TrendingUp, color: '#DB2777', orchestrator: 'Apache Airflow', schedule: 'Weekly · own dedicated DAG',
    sources: [{ name: 'ai-jobs-net-salaries', detail: 'weekly-updated public GitHub dataset, 2021-2025+' }],
    tables: ['fact_salary_by_experience', 'fact_salary_by_tool', 'fact_remote_ratio_trend', 'fact_top_paying_title_by_year'],
    note: 'The predictor\'s first model was honest but weak (R²=0.109). Adding job_title as a feature more than doubled accuracy to R²=0.2475.',
  },
  {
    id: 'news', group: 'shared', title: 'News & Sentiment Intelligence',
    tagline: 'Real-time sentiment scoring on data engineering news and discussion.',
    Icon: Newspaper, color: '#F97316', orchestrator: 'Apache Airflow', schedule: 'Daily · shared DAG',
    sources: [{ name: 'Currents API', detail: '70-term curated DE / AI-DE keyword sweep' }],
    tables: ['dim_keyword', 'dim_source', 'fact_keyword_mention', 'fact_keyword_sentiment_trend'],
    note: 'Sentiment scored via a real Hugging Face transformer (cardiffnlp/twitter-roberta-base-sentiment-latest), confidence-weighted.',
  },
  {
    id: 'research', group: 'dedicated', title: 'AI & Data Engineering Research',
    tagline: 'The newest and most feature-dense: a self-healing pipeline across 9 real academic sources.',
    Icon: Bot, color: '#4F46E5', orchestrator: 'Apache Airflow', schedule: 'Daily · own dedicated DAG (19 tasks)',
    sources: [
      { name: 'arXiv, Semantic Scholar, OpenAlex, Crossref, DBLP, Hugging Face Papers, Zenodo', detail: '93-keyword DE / AI-DE sweep across all 7' },
      { name: 'GitHub + Hacker News', detail: 'tooling and discussion signal' },
    ],
    tables: ['dim_research_source', 'fact_research_signal', 'fact_tool_adoption'],
    note: 'The most significant bug in the whole platform: sorting all 9 sources by recency alone starved 5 of them to zero representation. Fixed with fair per-source sampling.',
  },
]
export const MODEL_CATS = ['All', 'Forecasting', 'Clustering', 'Ranking', 'Prediction & NLP']

export const ML_MODELS = [
  ['AI Adoption Forecast', 'LinearRegression · GitHub + arXiv + HN', 'Forecasts AI tool adoption', 'Forecasting'],
  ['DE Tool Forecast', '10-year SO survey, per country + overall', 'Forecasts data engineering tool usage', 'Forecasting'],
  ['3-Year Salary Forecast', 'Real statistical prediction intervals', 'Forecasts salary trends', 'Forecasting'],
  ['7-Day Research Forecast', 'LinearRegression, daily paper volume', 'Predicts daily paper volume', 'Forecasting'],
  ['Growth Forecast', 'Per-country LinearRegression', 'Forecasts country growth', 'Forecasting'],
  ['Country AI Archetypes', 'k-means, 4 clusters', 'Clusters countries by AI maturity', 'Clustering'],
  ['Org Maturity Clustering', 'k-means, 4 archetypes', 'Clusters organisations', 'Clustering'],
  ['Career Archetype Clustering', 'k-means, 93 job titles', 'Groups similar job roles', 'Clustering'],
  ['Tool Co-Adoption Clustering', 'k-means on country pattern', 'Finds co-adoption patterns', 'Clustering'],
  ['Tool Momentum Staging', 'Emerging / Accelerating / Mature / Declining', 'Stages tools by lifecycle', 'Ranking'],
  ['Career Fit Recommender', 'Growth + salary joined', 'Recommends best-fit careers', 'Ranking'],
  ['Skill Growth Ranking', 'Per-tool salary regression slope', 'Ranks skills by growth', 'Ranking'],
  ['Live Salary Predictor', 'RandomForest, real-time inputs', 'Predicts salary from your inputs', 'Prediction & NLP'],
  ['Sentiment Scoring', 'HF transformer, confidence-weighted', 'Scores news sentiment', 'Prediction & NLP'],
  ['Keyword Breakout Detection', 'Honestly gated, threshold-based', 'Detects real breakouts, not noise', 'Prediction & NLP'],
]

export const CAT_META = {
  Forecasting: { icon: LineChart, color: '#2563EB' },
  Clustering: { icon: Boxes, color: '#7C3AED' },
  Ranking: { icon: Target, color: '#D97706' },
  'Prediction & NLP': { icon: MessageSquareText, color: '#DB2777' },
}

export const PRINCIPLES = [
  { icon: Shuffle, color: '#2563EB', title: 'ELT over ETL', text: 'Raw data lands untouched in Postgres first (bronze), and all transformation logic lives in version-controlled dbt models. The source of truth is always inspectable, and transformations can be rebuilt without re-fetching from source APIs.' },
  { icon: Layers, color: '#B45309', title: 'Medallion architecture', text: 'Bronze, silver and gold schemas separate raw ingestion, cleaning, and business-ready star-schema modelling. Each layer is testable on its own through dbt tests.' },
  { icon: Workflow, color: '#D97706', title: 'Four schedules, deliberately', text: 'Jenkins for the job-market pipeline\'s simple linear cron, one shared Airflow DAG for the daily fan-out/fan-in work, a weekly salary DAG that matches its real update cadence, and a dedicated 19-task research DAG that isn\'t shared with anything else.' },
  { icon: Container, color: '#0EA5E9', title: 'Self-hosted, not managed', text: 'Postgres, Jenkins, Airflow, Django, React and dbt all run in Docker on a single VPS I administer directly. Full control over cost and configuration, at the expense of the convenience managed services provide.' },
  { icon: MessageSquareText, color: '#16A34A', title: 'RAG grounded in real data', text: 'The chat assistant routes questions to live SQL over all eight pipelines\' gold schemas, or to vector retrieval over embedded case-study content. It is built to say "I don\'t know" rather than hallucinate when the source material doesn\'t cover something.' },
  { icon: ShieldCheck, color: '#7C3AED', title: 'Honest data-sufficiency gates', text: 'Every forecast reports "insufficient_data" below a real threshold rather than fabricating a confident trend from too few points. The same discipline makes the two self-healing agents log honestly, even when their log is empty because nothing has gone wrong yet.' },
  { icon: Scale, color: '#DB2777', title: 'Name clusters by content, not position', text: 'k-means assigns numeric cluster IDs arbitrarily, so the same semantic group can get a different ID from one run to the next. Every clustering model here names clusters by inspecting real anchor members or centroid characteristics, never by a fixed ID mapping.' },
  { icon: Gauge, color: '#4F46E5', title: 'Fair sampling over naive sorting', text: 'Sorting 9 sources together by a shared "recency" field looked correct until it silently starved sources whose date semantics differ. The lesson: never trust one shared sort order across genuinely heterogeneous sources.' },
]

export const STACK = [
  { group: 'Backend & data', color: '#2563EB', items: ['Django', 'Django REST Framework', 'PostgreSQL', 'pgvector', 'dbt'] },
  { group: 'Orchestration & infra', color: '#D97706', items: ['Apache Airflow', 'Jenkins', 'Terraform', 'Docker', 'Nginx', 'Cloudflare'] },
  { group: 'Frontend', color: '#7C3AED', items: ['React', 'Recharts', 'Vite', 'd3-geo'] },
  { group: 'ML & AI', color: '#16A34A', items: ['scikit-learn', 'Hugging Face Transformers', 'Google Gemini API'] },
  { group: 'Data sources', color: '#DB2777', items: ['Adzuna API', 'GitHub API', 'OSS Insight API', 'Currents API', 'Stack Overflow Developer Survey', 'Practical Data Community Survey', 'ai-jobs-net-salaries', 'arXiv API', 'Semantic Scholar API', 'OpenAlex API', 'Crossref API', 'DBLP API', 'Zenodo API'] },
]
