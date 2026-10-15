import { useState, useEffect, useMemo } from 'react'
import { Globe2, Wrench, Target, TrendingUp, Briefcase, Info, X, MapPin, ChevronDown, Sparkles, Github } from 'lucide-react'
import Globe, { prepareFeatures } from './Globe'
import 'leaflet/dist/leaflet.css'
import { COUNTRY_NAMES } from '../utils/countryNames'
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''



const ISO2_TO_ISO3 = {
  AF: 'AFG', AL: 'ALB', DZ: 'DZA', AD: 'AND', AO: 'AGO', AG: 'ATG', AR: 'ARG', AM: 'ARM',
  AU: 'AUS', AT: 'AUT', AZ: 'AZE', BS: 'BHS', BH: 'BHR', BD: 'BGD', BB: 'BRB', BY: 'BLR',
  BE: 'BEL', BZ: 'BLZ', BJ: 'BEN', BT: 'BTN', BO: 'BOL', BA: 'BIH', BW: 'BWA', BR: 'BRA',
  BN: 'BRN', BG: 'BGR', BF: 'BFA', BI: 'BDI', KH: 'KHM', CM: 'CMR', CA: 'CAN', CV: 'CPV',
  CF: 'CAF', TD: 'TCD', CL: 'CHL', CN: 'CHN', CO: 'COL', KM: 'COM', CG: 'COG', CD: 'COD',
  CR: 'CRI', CI: 'CIV', HR: 'HRV', CU: 'CUB', CY: 'CYP', CZ: 'CZE', DK: 'DNK', DJ: 'DJI',
  DM: 'DMA', DO: 'DOM', EC: 'ECU', EG: 'EGY', SV: 'SLV', GQ: 'GNQ', ER: 'ERI', EE: 'EST',
  SZ: 'SWZ', ET: 'ETH', FJ: 'FJI', FI: 'FIN', FR: 'FRA', GA: 'GAB', GM: 'GMB', GE: 'GEO',
  DE: 'DEU', GH: 'GHA', GR: 'GRC', GD: 'GRD', GT: 'GTM', GN: 'GIN', GW: 'GNB', GY: 'GUY',
  HT: 'HTI', HN: 'HND', HK: 'HKG', HU: 'HUN', IS: 'ISL', IN: 'IND', ID: 'IDN', IR: 'IRN',
  IQ: 'IRQ', IE: 'IRL', IL: 'ISR', IT: 'ITA', JM: 'JAM', JP: 'JPN', JO: 'JOR', KZ: 'KAZ',
  KE: 'KEN', KI: 'KIR', KP: 'PRK', KR: 'KOR', KW: 'KWT', KG: 'KGZ', LA: 'LAO', LV: 'LVA',
  LB: 'LBN', LS: 'LSO', LR: 'LBR', LY: 'LBY', LI: 'LIE', LT: 'LTU', LU: 'LUX', MO: 'MAC',
  MG: 'MDG', MW: 'MWI', MY: 'MYS', MV: 'MDV', ML: 'MLI', MT: 'MLT', MR: 'MRT', MU: 'MUS',
  MX: 'MEX', MD: 'MDA', MC: 'MCO', MN: 'MNG', ME: 'MNE', MA: 'MAR', MZ: 'MOZ', MM: 'MMR',
  NA: 'NAM', NP: 'NPL', NL: 'NLD', NZ: 'NZL', NI: 'NIC', NE: 'NER', NG: 'NGA', MK: 'MKD',
  NO: 'NOR', OM: 'OMN', PK: 'PAK', PA: 'PAN', PG: 'PNG', PY: 'PRY', PE: 'PER', PH: 'PHL',
  PL: 'POL', PT: 'PRT', QA: 'QAT', RO: 'ROU', RU: 'RUS', RW: 'RWA', WS: 'WSM', SM: 'SMR',
  SA: 'SAU', SN: 'SEN', RS: 'SRB', SC: 'SYC', SL: 'SLE', SG: 'SGP', SK: 'SVK', SI: 'SVN',
  SB: 'SLB', SO: 'SOM', ZA: 'ZAF', SS: 'SSD', ES: 'ESP', LK: 'LKA', SD: 'SDN', SR: 'SUR',
  SE: 'SWE', CH: 'CHE', SY: 'SYR', TW: 'TWN', TJ: 'TJK', TZ: 'TZA', TH: 'THA', TL: 'TLS',
  TG: 'TGO', TO: 'TON', TT: 'TTO', TN: 'TUN', TR: 'TUR', TM: 'TKM', UG: 'UGA', UA: 'UKR',
  AE: 'ARE', GB: 'GBR', US: 'USA', UY: 'URY', UZ: 'UZB', VU: 'VUT', VA: 'VAT', VE: 'VEN',
  VN: 'VNM', YE: 'YEM', ZM: 'ZMB', ZW: 'ZWE',
}

const ARCHETYPE_COLORS = {
  'AI-Leaning Hub': '#8B5CF6',
  'Balanced Tech Hub': '#06B6D4',
  'Traditional-Leaning Hub': '#F59E0B',
  'Emerging Market': '#EC4899',
}

const ARCHETYPE_DESCRIPTIONS = {
  'AI-Leaning Hub': 'Smaller markets where AI-native tools make up most of the tracked activity.',
  'Balanced Tech Hub': 'Large, established markets with high overall activity, roughly evenly split.',
  'Traditional-Leaning Hub': 'Markets where traditional data engineering tools still lead.',
  'Emerging Market': 'Growing markets currently leaning more traditional than AI.',
}

const TOOL_DISPLAY_NAMES = {
  'apache/airflow': 'Airflow', 'dbt-labs/dbt-core': 'dbt', 'apache/spark': 'Spark',
  'apache/kafka': 'Kafka', 'airbytehq/airbyte': 'Airbyte', 'dagster-io/dagster': 'Dagster',
  'apache/flink': 'Flink', 'apache/nifi': 'NiFi', 'great-expectations/great_expectations': 'Great Expectations',
  'meltano/meltano': 'Meltano', 'PrefectHQ/prefect': 'Prefect', 'duckdb/duckdb': 'DuckDB',
  'ClickHouse/ClickHouse': 'ClickHouse', 'trinodb/trino': 'Trino',
  'langchain-ai/langchain': 'LangChain', 'run-llama/llama_index': 'LlamaIndex',
  'pgvector/pgvector': 'pgvector', 'weaviate/weaviate': 'Weaviate', 'milvus-io/milvus': 'Milvus',
  'mlflow/mlflow': 'MLflow', 'deepset-ai/haystack': 'Haystack', 'qdrant/qdrant': 'Qdrant',
  'chroma-core/chroma': 'Chroma', 'feast-dev/feast': 'Feast', 'ray-project/ray': 'Ray',
  'BerriAI/litellm': 'LiteLLM', 'golang/go': 'Go', 'rust-lang/rust': 'Rust',
  'redis/redis': 'Redis', 'elastic/elasticsearch': 'Elasticsearch', 'grafana/grafana': 'Grafana',
  'apache/superset': 'Superset', 'mongodb/mongo': 'MongoDB', 'postgres/postgres': 'PostgreSQL',
}

// Falls back to a clean, title-cased version of the repo name for anything not in the map above
function getToolDisplayName(repoFullName) {
  if (TOOL_DISPLAY_NAMES[repoFullName]) return TOOL_DISPLAY_NAMES[repoFullName]
  const name = repoFullName.split('/')[1] || repoFullName
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function isoToFlag(iso2) {
  if (!iso2 || iso2.length !== 2) return '🌐'
  return iso2.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

// Amber (traditional-leaning) -> Violet (AI-leaning) — used ONLY for the AI-vs-Traditional layer
function aiShareColor(pct) {
  if (pct == null) return null
  const t = Math.max(0, Math.min(1, pct))
  const from = [245, 158, 11]  // #F59E0B amber
  const to = [139, 92, 246]    // #8B5CF6 violet
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * t))
  return `rgb(${rgb.join(',')})`
}

const LAYER_META = [
  { id: 'ai-vs-traditional', label: 'AI vs Traditional', icon: Globe2,
    blurb: 'Which countries lean on AI-native data tools, and which still lean on traditional ones?' },
  { id: 'per-tool', label: 'Per-Tool Breakdown', icon: Wrench,
    blurb: 'How popular is one chosen tool in each country? Pick a tool below.' },
  { id: 'archetype', label: 'Archetype Clusters', icon: Target,
    blurb: 'A machine-learning model groups countries into four adoption patterns.' },
  { id: 'growth', label: 'Growth Forecast', icon: TrendingUp,
    blurb: 'Where AI adoption is heading over the next 30 days, projected from each country’s own history.' },
  { id: 'career', label: 'Career Fit', icon: Briefcase,
    blurb: 'Where AI adoption is growing fastest, shown next to typical salary and open jobs.' },
]

const SEQ = { light: [[230, 218, 254], [109, 40, 217]], dark: [[51, 65, 85], [139, 92, 246]] }
function seqColor(ratio, dark) {
  const t = Math.max(0, Math.min(1, ratio ?? 0))
  const [a, b] = dark ? SEQ.dark : SEQ.light
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * t)).join(',')})`
}

const ISO3_TO_ISO2 = Object.fromEntries(Object.entries(ISO2_TO_ISO3).map(([k, v]) => [v, k]))
const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`

function GisAiMapSlide() {
  const [features, setFeatures] = useState([])
  const [countryData, setCountryData] = useState([])
  const [archetypeData, setArchetypeData] = useState([])
  const [toolList, setToolList] = useState([])
  const [selectedTool, setSelectedTool] = useState('')
  const [toolData, setToolData] = useState([])
  const [growthForecastData, setGrowthForecastData] = useState([])
  const [careerFitData, setCareerFitData] = useState([])
  const [activeLayer, setActiveLayer] = useState('ai-vs-traditional')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [dark, setDark] = useState(document.documentElement.getAttribute('data-theme') === 'dark')
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(null)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    fetch('/world-countries.geo.json').then((res) => res.json()).then((g) => setFeatures(prepareFeatures(g)))
      .catch((err) => console.error('Failed to load world boundaries:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/country-ai-signal/`)
      .then((res) => res.json())
      .then((data) => { setCountryData(data); setLoading(false) })
      .catch((err) => { console.error('Failed to load country AI signal:', err); setFailed(true); setLoading(false) })
  }, [])

  useEffect(() => {
    if (activeLayer === 'archetype' && archetypeData.length === 0) {
      fetch(`${API_BASE}/api/country-archetype/`).then((res) => res.json()).then(setArchetypeData)
        .catch((err) => console.error('Failed to load archetype data:', err))
    }
    if (activeLayer === 'growth' && growthForecastData.length === 0) {
      fetch(`${API_BASE}/api/country-growth-forecast/`).then((res) => res.json()).then(setGrowthForecastData)
        .catch((err) => console.error('Failed to load growth forecast data:', err))
    }
    if (activeLayer === 'career' && careerFitData.length === 0) {
      fetch(`${API_BASE}/api/career-fit/`).then((res) => res.json()).then(setCareerFitData)
        .catch((err) => console.error('Failed to load career fit data:', err))
    }
    if (activeLayer === 'per-tool' && toolList.length === 0) {
      fetch(`${API_BASE}/api/tool-list/`)
        .then((res) => res.json())
        .then((data) => { setToolList(data); if (data.length > 0) setSelectedTool(data[0].repo_full_name) })
        .catch((err) => console.error('Failed to load tool list:', err))
    }
  }, [activeLayer]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeLayer === 'per-tool' && selectedTool) {
      fetch(`${API_BASE}/api/country-tool-signal/?repo=${encodeURIComponent(selectedTool)}`)
        .then((res) => res.json()).then(setToolData)
        .catch((err) => console.error('Failed to load tool signal:', err))
    }
  }, [activeLayer, selectedTool])

  const totalCountries = countryData.length
  const totalStars = countryData.reduce((sum, d) => sum + d.total_stargazers, 0)
  const globalAiShare = totalStars > 0
    ? (countryData.reduce((sum, d) => sum + d.ai_stargazers, 0) / totalStars * 100).toFixed(1)
    : null
  const meta = LAYER_META.find((l) => l.id === activeLayer)

  // everything that depends on the active layer, in one place
  const view = useMemo(() => {
    const byIso3 = {}
    const add = (list, f) => list.forEach((d) => { const iso3 = ISO2_TO_ISO3[d.country_code]; if (iso3) byIso3[iso3] = f ? f(d) : d })
    let fillOf = (d) => aiShareColor(d.ai_share_pct)
    let ranking = []
    let rankTitle = 'Top countries by activity'
    let legend = { kind: 'ramp', lo: 'Traditional-leaning', hi: 'AI-leaning', css: 'linear-gradient(90deg,#F59E0B,#8B5CF6)' }
    let howto = [
      ['#F59E0B', 'Amber: developers there mostly use traditional data engineering tools.'],
      ['#8B5CF6', 'Violet: AI-native tools lead. Grey countries have no tracked data yet.'],
      [null, 'AI share = the part of all tracked developer attention (GitHub stars) that goes to AI-native tools.'],
    ]
    const seqCss = `linear-gradient(90deg, rgb(${(dark ? SEQ.dark : SEQ.light)[0].join(',')}), rgb(${(dark ? SEQ.dark : SEQ.light)[1].join(',')}))`

    if (activeLayer === 'archetype') {
      add(archetypeData)
      fillOf = (d) => ARCHETYPE_COLORS[d.archetype]
      const counts = {}
      archetypeData.forEach((d) => { counts[d.archetype] = (counts[d.archetype] || 0) + 1 })
      ranking = Object.keys(ARCHETYPE_COLORS).map((name) => ({ key: name, name, color: ARCHETYPE_COLORS[name], value: `${counts[name] || 0} countries`, static: true }))
      rankTitle = 'The four patterns'
      legend = { kind: 'dots' }
      howto = Object.keys(ARCHETYPE_COLORS).map((n) => [ARCHETYPE_COLORS[n], `${n}: ${ARCHETYPE_DESCRIPTIONS[n]}`])
      howto.push([null, 'Groups are found by a clustering model (k-means), not assigned by hand.'])
    } else if (activeLayer === 'per-tool') {
      const max = toolData.length ? Math.max(...toolData.map((t) => t.stargazers)) : 1
      add(toolData, (d) => ({ ...d, ratio: d.stargazers / max }))
      fillOf = (d) => seqColor(d.ratio, dark)
      ranking = [...toolData].sort((a, b) => b.stargazers - a.stargazers).slice(0, 8)
        .map((c) => ({ key: c.country_code, iso3: ISO2_TO_ISO3[c.country_code], name: COUNTRY_NAMES[c.country_code] || c.country_code, value: c.stargazers.toLocaleString() }))
      rankTitle = `Where ${selectedTool ? getToolDisplayName(selectedTool) : 'this tool'} is most popular`
      legend = { kind: 'ramp', lo: 'Less popular', hi: 'Most popular', css: seqCss }
      howto = [
        [null, 'Colour shows how popular this one tool is in each country, compared with where it is most popular.'],
        [null, 'Pick another tool from the list to compare. Grey countries have no stars for this tool.'],
      ]
    } else if (activeLayer === 'growth') {
      add(growthForecastData.filter((d) => d.status === 'ok'))
      fillOf = (d) => aiShareColor(d.predicted_ai_share_pct_30d)
      ranking = growthForecastData.filter((d) => d.status === 'ok').sort((a, b) => b.growth_rate_per_day - a.growth_rate_per_day).slice(0, 8)
        .map((c) => ({ key: c.country_code, iso3: ISO2_TO_ISO3[c.country_code], name: COUNTRY_NAMES[c.country_code] || c.country_code, value: pct(c.predicted_ai_share_pct_30d) }))
      rankTitle = 'Fastest-rising (predicted in 30 days)'
      legend = { kind: 'ramp', lo: 'Predicted traditional-leaning', hi: 'Predicted AI-leaning', css: 'linear-gradient(90deg,#F59E0B,#8B5CF6)' }
      howto = [
        [null, 'A straight-line trend (linear regression) fitted to each country’s real daily history and projected 30 days ahead.'],
        [null, 'Only countries with 7+ days of real history are shown, so nothing is invented from too little data.'],
      ]
    } else if (activeLayer === 'career') {
      const rates = careerFitData.map((d) => d.growth_rate_per_day)
      const lo = rates.length ? Math.min(...rates) : 0
      const hi = rates.length ? Math.max(...rates) : 1
      add(careerFitData, (d) => ({ ...d, ratio: hi > lo ? (d.growth_rate_per_day - lo) / (hi - lo) : 0.5 }))
      fillOf = (d) => seqColor(d.ratio, dark)
      ranking = careerFitData.slice(0, 8).map((c) => ({ key: c.country_code, iso3: ISO2_TO_ISO3[c.country_code], name: c.country_name, value: `$${Math.round(c.mid_salary_usd / 1000)}K` }))
      rankTitle = 'Fastest AI growth (with mid-level salary)'
      legend = { kind: 'ramp', lo: 'Slower AI growth', hi: 'Faster AI growth', css: seqCss }
      howto = [
        [null, 'Real AI-growth trend shown next to real salary and job-posting data for countries that have both.'],
        [null, 'This shows two signals side by side. It does not claim one causes the other.'],
      ]
    } else {
      add(countryData)
      ranking = [...countryData].sort((a, b) => b.total_stargazers - a.total_stargazers).slice(0, 8)
        .map((c) => ({ key: c.country_code, iso3: ISO2_TO_ISO3[c.country_code], name: COUNTRY_NAMES[c.country_code] || c.country_code, value: c.total_stargazers.toLocaleString() }))
    }
    const fills = {}
    Object.entries(byIso3).forEach(([iso3, d]) => { const c = fillOf(d); if (c) fills[iso3] = c })
    return { byIso3, fills, ranking, rankTitle, legend, howto }
  }, [activeLayer, countryData, archetypeData, toolData, growthForecastData, careerFitData, selectedTool, dark])

  const nameOf = (iso3) => {
    const f = features.find((x) => x.id === iso3)
    return COUNTRY_NAMES[ISO3_TO_ISO2[iso3]] || f?.properties?.name || iso3
  }
  const flagOf = (iso3) => isoToFlag(ISO3_TO_ISO2[iso3])

  const pick = (iso3) => { if (!iso3) return; setSelected(iso3); setFocus({ id: iso3, n: Date.now() }) }

  const headline = (iso3) => {
    const d = view.byIso3[iso3]
    if (!d) return 'No tracked activity yet'
    if (activeLayer === 'archetype') return d.archetype
    if (activeLayer === 'per-tool') return `${d.stargazers.toLocaleString()} stars`
    if (activeLayer === 'growth') return `${pct(d.predicted_ai_share_pct_30d)} AI-leaning in 30 days`
    if (activeLayer === 'career') return `$${d.mid_salary_usd.toLocaleString()} mid-level salary`
    return `${pct(d.ai_share_pct, 0)} AI-leaning`
  }

  const tooltip = (f) => (
    <>
      <div className="gx-tip-title">{flagOf(f.id)} {nameOf(f.id)}</div>
      <div className={view.byIso3[f.id] ? 'gx-tip-line' : 'gx-tip-line muted'}>{headline(f.id)}</div>
    </>
  )

  function renderSelected() {
    if (!selected) {
      return (
        <div className="gx-card gx-hintcard">
          <MapPin size={18} />
          <div>
            <strong>Pick a country</strong>
            <span>Click any country on the globe, or one in the list below, to see its numbers here.</span>
          </div>
        </div>
      )
    }
    const d = view.byIso3[selected]
    return (
      <div className="gx-card gx-sel">
        <button className="gx-sel-x" onClick={() => setSelected(null)} aria-label="Clear selection"><X size={14} /></button>
        <div className="gx-sel-name"><span className="gx-flag">{flagOf(selected)}</span>{nameOf(selected)}</div>
        {!d ? (
          <p className="gx-sel-empty">No tracked activity for this view yet.</p>
        ) : activeLayer === 'archetype' ? (
          <>
            <div className="gx-sel-pill" style={{ '--c': ARCHETYPE_COLORS[d.archetype] }}>{d.archetype}</div>
            <p className="gx-sel-text">{ARCHETYPE_DESCRIPTIONS[d.archetype]}</p>
            <div className="gx-sel-meta">AI share: <b>{pct(d.ai_share_pct)}</b></div>
          </>
        ) : activeLayer === 'per-tool' ? (
          <>
            <div className="gx-big">{d.stargazers.toLocaleString()} <span>stars for {getToolDisplayName(selectedTool)}</span></div>
            <div className="gx-sel-meta"><b>{pct(d.percentage)}</b> of this tool’s worldwide stars come from here.</div>
          </>
        ) : activeLayer === 'growth' ? (
          <>
            <div className="gx-flow">
              <div><span>Now</span><b>{pct(d.current_ai_share_pct)}</b></div>
              <i>{d.growth_rate_per_day >= 0 ? '↗' : '↘'}</i>
              <div><span>In 30 days</span><b>{pct(d.predicted_ai_share_pct_30d)}</b></div>
            </div>
            <div className="gx-sel-meta">AI-leaning share, from {d.days_of_history} days of history (fit quality R² {d.r_squared}).</div>
          </>
        ) : activeLayer === 'career' ? (
          <>
            <div className="gx-big">${d.mid_salary_usd.toLocaleString()} <span>mid-level salary</span></div>
            <div className="gx-sel-meta"><b>{d.job_count.toLocaleString()}</b> tracked job postings · AI growth <b>{pct(d.growth_rate_per_day, 2)}</b> per day</div>
          </>
        ) : (
          <>
            <div className="gx-big">{pct(d.ai_share_pct, 0)} <span>AI-leaning</span></div>
            <div className="gx-split" aria-hidden="true">
              <i style={{ width: `${(100 - d.ai_share_pct * 100).toFixed(0)}%` }} />
              <b style={{ width: `${(d.ai_share_pct * 100).toFixed(0)}%` }} />
            </div>
            <div className="gx-split-lbl"><span>Traditional</span><span>AI-native</span></div>
            <div className="gx-sel-meta"><b>{d.total_stargazers.toLocaleString()}</b> tracked stars in total</div>
          </>
        )}
      </div>
    )
  }

  const kpis = [
    { icon: MapPin, value: totalCountries || '—', label: 'Countries tracked', help: 'Countries with enough GitHub activity to measure' },
    { icon: Sparkles, value: globalAiShare ? `${globalAiShare}%` : '—', label: 'Global AI share', help: 'Share of developer attention going to AI-native tools' },
    { icon: Github, value: 122, label: 'Repos analysed', help: 'Open-source data & AI projects followed' },
  ]

  return (
    <div className="gx-slide gx-gis">
      <div className="gx-head">
        <div>
          <div className="eyebrow gx-eyebrow">AI Adoption Map · Where the shift is happening</div>
          <p className="gx-sub">Each country is coloured by what its developers explore on GitHub: AI-native tools or traditional data engineering tools. Spin the globe and click a country.</p>
        </div>
      </div>

      <div className="gx-kpis">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div className="gx-kpi" key={k.label} title={k.help}>
              <span className="gx-kpi-ico"><Icon size={16} /></span>
              <div><div className="gx-kpi-val">{k.value}</div><div className="gx-kpi-lbl">{k.label}</div></div>
            </div>
          )
        })}
      </div>

      <div className="gx-tabs" role="tablist" aria-label="Map views">
        {LAYER_META.map((l) => {
          const Icon = l.icon
          return (
            <button key={l.id} role="tab" aria-selected={activeLayer === l.id}
              className={`gx-tab${activeLayer === l.id ? ' on' : ''}`} onClick={() => setActiveLayer(l.id)}>
              <Icon size={15} /> <span>{l.label}</span>
            </button>
          )
        })}
      </div>

      <div className="gx-explain">
        <p><Info size={14} /> {meta.blurb}</p>
        {activeLayer === 'per-tool' && toolList.length > 0 && (
          <label className="gx-select">
            <span>Tool</span>
            <select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)}>
              {toolList.map((t) => (
                <option key={t.repo_full_name} value={t.repo_full_name}>{getToolDisplayName(t.repo_full_name)}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="gx-grid">
        <div className="gx-card gx-globe-card">
          {loading || features.length === 0 ? (
            <div className="gx-globe-wrap gx-loading"><div className="gx-orb" /><span>Loading live data…</span></div>
          ) : (
            <Globe features={features} fills={view.fills} activeId={selected} focus={focus}
              tooltip={tooltip} onPick={(f) => pick(f.id)} label="Globe of AI adoption by country" />
          )}
          {failed && <div className="gx-warn">Live data is unavailable right now. Please try again later.</div>}
          <div className="gx-legend">
            {view.legend.kind === 'dots' ? (
              <div className="gx-dots">
                {Object.entries(ARCHETYPE_COLORS).map(([name, color]) => (
                  <span key={name}><i style={{ background: color }} />{name}</span>
                ))}
              </div>
            ) : (
              <div className="gx-ramp">
                <span>{view.legend.lo}</span>
                <i style={{ background: view.legend.css }} />
                <span>{view.legend.hi}</span>
              </div>
            )}
            <div className="gx-hint">Drag to spin · click a country · grey = no data yet</div>
          </div>
        </div>

        <div className="gx-side">
          {renderSelected()}
          <div className="gx-card">
            <div className="gx-card-title">{view.rankTitle}</div>
            {view.ranking.length === 0 && <p className="gx-sel-empty">Loading…</p>}
            {view.ranking.map((r, i) => (
              r.static ? (
                <div className="gx-rank static" key={r.key}>
                  <i className="gx-dot" style={{ background: r.color }} />
                  <span className="gx-rank-name">{r.name}</span>
                  <span className="gx-rank-val">{r.value}</span>
                </div>
              ) : (
                <button className={`gx-rank${selected === r.iso3 ? ' on' : ''}`} key={r.key} onClick={() => pick(r.iso3)}>
                  <span className="gx-rank-n">{i + 1}</span>
                  <span className="gx-rank-name">{flagOf(r.iso3)} {r.name}</span>
                  <span className="gx-rank-val">{r.value}</span>
                </button>
              )
            ))}
          </div>
          <details className="gx-card gx-how" open>
            <summary>How to read this <ChevronDown size={15} /></summary>
            {view.howto.map(([color, text], i) => (
              <p key={i}>{color && <i className="gx-sw" style={{ background: color }} />}{text}</p>
            ))}
          </details>
        </div>
      </div>

      <div className="gx-foot">Live data from GitHub via OSS Insight, refreshed daily via Apache Airflow.</div>
    </div>
  )
}

export default GisAiMapSlide
