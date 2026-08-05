import { useState, useEffect } from 'react'
import { MapContainer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''


const COUNTRY_NAMES = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra', AO: 'Angola',
  AG: 'Antigua and Barbuda', AR: 'Argentina', AM: 'Armenia', AU: 'Australia', AT: 'Austria',
  AZ: 'Azerbaijan', BS: 'Bahamas', BH: 'Bahrain', BD: 'Bangladesh', BB: 'Barbados',
  BY: 'Belarus', BE: 'Belgium', BZ: 'Belize', BJ: 'Benin', BT: 'Bhutan',
  BO: 'Bolivia', BA: 'Bosnia and Herzegovina', BW: 'Botswana', BR: 'Brazil', BN: 'Brunei',
  BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi', KH: 'Cambodia', CM: 'Cameroon',
  CA: 'Canada', CV: 'Cape Verde', CF: 'Central African Republic', TD: 'Chad', CL: 'Chile',
  CN: 'China', CO: 'Colombia', KM: 'Comoros', CG: 'Congo', CD: 'DR Congo',
  CR: 'Costa Rica', CI: "Côte d'Ivoire", HR: 'Croatia', CU: 'Cuba', CY: 'Cyprus',
  CZ: 'Czechia', DK: 'Denmark', DJ: 'Djibouti', DM: 'Dominica', DO: 'Dominican Republic',
  EC: 'Ecuador', EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', SZ: 'Eswatini', ET: 'Ethiopia', FJ: 'Fiji', FI: 'Finland',
  FR: 'France', GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany',
  GH: 'Ghana', GR: 'Greece', GD: 'Grenada', GT: 'Guatemala', GN: 'Guinea',
  GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', HK: 'Hong Kong',
  HU: 'Hungary', IS: 'Iceland', IN: 'India', ID: 'Indonesia', IR: 'Iran',
  IQ: 'Iraq', IE: 'Ireland', IL: 'Israel', IT: 'Italy', JM: 'Jamaica',
  JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya', KI: 'Kiribati',
  KP: 'North Korea', KR: 'South Korea', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos',
  LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya',
  LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MO: 'Macau', MG: 'Madagascar',
  MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali', MT: 'Malta',
  MR: 'Mauritania', MU: 'Mauritius', MX: 'Mexico', MD: 'Moldova', MC: 'Monaco',
  MN: 'Mongolia', ME: 'Montenegro', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar',
  NA: 'Namibia', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand', NI: 'Nicaragua',
  NE: 'Niger', NG: 'Nigeria', MK: 'North Macedonia', NO: 'Norway', OM: 'Oman',
  PK: 'Pakistan', PA: 'Panama', PG: 'Papua New Guinea', PY: 'Paraguay', PE: 'Peru',
  PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RO: 'Romania',
  RU: 'Russia', RW: 'Rwanda', WS: 'Samoa', SM: 'San Marino', SA: 'Saudi Arabia',
  SN: 'Senegal', RS: 'Serbia', SC: 'Seychelles', SL: 'Sierra Leone', SG: 'Singapore',
  SK: 'Slovakia', SI: 'Slovenia', SB: 'Solomon Islands', SO: 'Somalia', ZA: 'South Africa',
  SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname',
  SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan',
  TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo', TO: 'Tonga',
  TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Turkey', TM: 'Turkmenistan', UG: 'Uganda',
  UA: 'Ukraine', AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States', UY: 'Uruguay',
  UZ: 'Uzbekistan', VU: 'Vanuatu', VA: 'Vatican City', VE: 'Venezuela', VN: 'Vietnam',
  YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe',
}
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

const LAYERS = [
  { id: 'ai-vs-traditional', label: 'AI vs Traditional', icon: '🌐', ready: true },
  { id: 'per-tool', label: 'Per-Tool Breakdown', icon: '🔧', ready: true },
  { id: 'archetype', label: 'Archetype Clusters', icon: '🎯', ready: true },
  { id: 'growth', label: 'Growth Forecast', icon: '📈', ready: false },
  { id: 'career', label: 'Career Fit', icon: '💼', ready: false },
]

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

// Single-hue intensity gradient — used for Per-Tool Breakdown, since a single
// tool has no "AI vs traditional" lean of its own, just relative popularity
function toolIntensityColor(ratio) {
  if (ratio == null) return null
  const t = Math.max(0, Math.min(1, ratio))
  const from = [30, 41, 59]     // dark slate (low popularity here)
  const to = [139, 92, 246]     // violet (highest popularity here)
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * t))
  return `rgb(${rgb.join(',')})`
}

function GisAiMapSlide() {
  const [countryData, setCountryData] = useState([])
  const [archetypeData, setArchetypeData] = useState([])
  const [toolList, setToolList] = useState([])
  const [selectedTool, setSelectedTool] = useState('')
  const [toolData, setToolData] = useState([])
  const [geoJson, setGeoJson] = useState(null)
  const [activeLayer, setActiveLayer] = useState('ai-vs-traditional')
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light')
  const [growthStatus, setGrowthStatus] = useState(null)

  console.log('GisAiMapSlide theme:', theme)

  useEffect(() => {
    fetch(`${API_BASE}/api/growth-forecast-status/`).then((r) => r.json()).then(setGrowthStatus).catch(console.error)
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    fetch('/world-countries.geo.json').then((res) => res.json()).then(setGeoJson)
      .catch((err) => console.error('Failed to load world boundaries:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/country-ai-signal/`)
      .then((res) => res.json())
      .then((data) => { setCountryData(data); setLoading(false) })
      .catch((err) => { console.error('Failed to load country AI signal:', err); setLoading(false) })
  }, [])

  useEffect(() => {
    if (activeLayer === 'archetype' && archetypeData.length === 0) {
      fetch(`${API_BASE}/api/country-archetype/`).then((res) => res.json()).then(setArchetypeData)
        .catch((err) => console.error('Failed to load archetype data:', err))
    }
  }, [activeLayer])

  useEffect(() => {
    if (activeLayer === 'per-tool' && toolList.length === 0) {
      fetch(`${API_BASE}/api/tool-list/`)
        .then((res) => res.json())
        .then((data) => { setToolList(data); if (data.length > 0) setSelectedTool(data[0].repo_full_name) })
        .catch((err) => console.error('Failed to load tool list:', err))
    }
  }, [activeLayer])

  useEffect(() => {
    if (activeLayer === 'per-tool' && selectedTool) {
      fetch(`${API_BASE}/api/country-tool-signal/?repo=${encodeURIComponent(selectedTool)}`)
        .then((res) => res.json()).then(setToolData)
        .catch((err) => console.error('Failed to load tool signal:', err))
    }
  }, [activeLayer, selectedTool])

  const totalCountries = countryData.length
  const globalAiShare = countryData.length > 0
    ? (countryData.reduce((sum, d) => sum + d.ai_stargazers, 0) /
       countryData.reduce((sum, d) => sum + d.total_stargazers, 0) * 100).toFixed(1)
    : null
  const topCountries = [...countryData].sort((a, b) => b.total_stargazers - a.total_stargazers).slice(0, 5)
  const layers = LAYERS.map((l) =>
    l.id === 'growth' ? { ...l, ready: growthStatus?.ready ?? false } : l
  )
  const currentLayer = layers.find((l) => l.id === activeLayer)
  const mapReady = currentLayer?.ready
  const noDataColor = theme === 'dark' ? '#1E293B' : '#E2E8F0'
  const oceanColor = theme === 'dark' ? '#0B1220' : '#EFF6FF'

  const dataByIso3 = {}
  if (activeLayer === 'archetype') {
    archetypeData.forEach((d) => { const iso3 = ISO2_TO_ISO3[d.country_code]; if (iso3) dataByIso3[iso3] = d })
  } else if (activeLayer === 'per-tool') {
    const maxToolStars = toolData.length > 0 ? Math.max(...toolData.map((t) => t.stargazers)) : 1
    toolData.forEach((d) => { const iso3 = ISO2_TO_ISO3[d.country_code]; if (iso3) dataByIso3[iso3] = { ...d, ratio: d.stargazers / maxToolStars } })
  } else {
    countryData.forEach((d) => { const iso3 = ISO2_TO_ISO3[d.country_code]; if (iso3) dataByIso3[iso3] = d })
  }

  function styleFeature(feature) {
    const d = dataByIso3[feature.id]
    let fillColor = noDataColor
    if (d) {
      if (activeLayer === 'archetype') fillColor = ARCHETYPE_COLORS[d.archetype] || noDataColor
      else if (activeLayer === 'per-tool') fillColor = toolIntensityColor(d.ratio) || noDataColor
      else fillColor = aiShareColor(d.ai_share_pct) || noDataColor
    }
    const borderColor = theme === 'dark' ? 'rgba(255,255,255,0.35)' : '#334155'
    return { fillColor, weight: 0.7, color: borderColor, fillOpacity: d ? 0.9 : 0.4 }
  }

  function onEachFeature(feature, layer) {
    const d = dataByIso3[feature.id]
    const name = feature.properties.name
    const flag = isoToFlag(Object.keys(ISO2_TO_ISO3).find((k) => ISO2_TO_ISO3[k] === feature.id))

    let html
    if (!d) {
      html = `<div class="gis-popup-inner"><div class="gis-popup-title">${flag} ${name}</div><div class="gis-popup-empty">No tracked activity yet</div></div>`
    } else if (activeLayer === 'archetype') {
      html = `<div class="gis-popup-inner">
        <div class="gis-popup-title">${flag} ${name}</div>
        <div class="gis-popup-row"><span class="gis-popup-dot" style="background:${ARCHETYPE_COLORS[d.archetype]}"></span>${d.archetype}</div>
        <div class="gis-popup-row">⭐ ${(d.ai_share_pct * 100).toFixed(1)}% AI-leaning share</div>
      </div>`
    } else if (activeLayer === 'per-tool') {
      html = `<div class="gis-popup-inner">
        <div class="gis-popup-title">${flag} ${name}</div>
        <div class="gis-popup-row">🔧 ${getToolDisplayName(selectedTool)}</div>
        <div class="gis-popup-row">⭐ ${d.stargazers.toLocaleString()} stars</div>
        <div class="gis-popup-row">📊 ${(d.percentage * 100).toFixed(1)}% of this tool's global stars</div>
      </div>`
    } else {
      html = `<div class="gis-popup-inner">
        <div class="gis-popup-title">${flag} ${name}</div>
        <div class="gis-popup-row">⭐ ${d.total_stargazers.toLocaleString()} total tracked stars</div>
        <div class="gis-popup-bar">
          <div class="gis-popup-bar-traditional" style="width:${(100 - d.ai_share_pct * 100).toFixed(0)}%"></div>
          <div class="gis-popup-bar-ai" style="width:${(d.ai_share_pct * 100).toFixed(0)}%"></div>
        </div>
        <div class="gis-popup-legend-mini"><span>Traditional</span><span>${(d.ai_share_pct * 100).toFixed(1)}% AI</span><span>AI</span></div>
      </div>`
    }
    layer.bindPopup(html, { className: 'gis-popup' })
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 2, color: theme === 'dark' ? '#fff' : '#0F172A' }),
      mouseout: (e) => e.target.setStyle({ weight: 0.7, color: theme === 'dark' ? 'rgba(255,255,255,0.35)' : '#475569' }),
    })
  }

  function renderSidePanel() {
    if (activeLayer === 'archetype') {
      const counts = {}
      archetypeData.forEach((d) => { counts[d.archetype] = (counts[d.archetype] || 0) + 1 })
      return (
        <>
          <div className="gis-side-card">
            <div className="gis-side-title">{selectedTool ? getToolDisplayName(selectedTool) : 'Tool'}</div>
            {Object.entries(ARCHETYPE_COLORS).map(([name, color]) => (
              <div className="gis-rank-row" key={name}>
                <span className="archetype-legend-dot" style={{ background: color }}></span>
                <span className="gis-rank-name">{name}</span>
                <span className="gis-rank-value">{counts[name] || 0} countries</span>
              </div>
            ))}
          </div>
          <div className="gis-side-card gis-side-card-note">
            <div className="gis-side-title">What this means</div>
            <p>Countries are grouped by a clustering model (k-means) into 4 patterns, based on how AI-leaning they are and how much total activity they have — not assigned by hand.</p>
            {archetypeData.length > 0 && (
              <p style={{ marginTop: 8 }}>{ARCHETYPE_DESCRIPTIONS[archetypeData[0].archetype]}</p>
            )}
          </div>
        </>
      )
    }

    if (activeLayer === 'per-tool') {
      const sorted = [...toolData].sort((a, b) => b.stargazers - a.stargazers).slice(0, 5)
      const total = toolData.reduce((sum, d) => sum + d.stargazers, 0)
      return (
        <>
          <div className="gis-side-card">
            <div className="gis-side-title">{selectedTool || 'Tool'}</div>
            <div className="gis-tool-total">{total.toLocaleString()} <span>tracked stars worldwide</span></div>
            {sorted.map((c, i) => (
              <div className="gis-rank-row" key={c.country_code}>
                <span className="gis-rank-num">#{i + 1}</span>
                <span className="gis-rank-name">{COUNTRY_NAMES[c.country_code] || c.country_code}</span>
                <span className="gis-rank-value">{c.stargazers.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="gis-side-card gis-side-card-note">
            <div className="gis-side-title">How to read this</div>
            <p>Color shows this tool's relative popularity by country — darker means less popular there, violet means most popular there. Pick a different tool from the dropdown above to compare.</p>
          </div>
        </>
      )
    }

    // default: ai-vs-traditional
    const sortedByShare = [...countryData].filter((d) => d.total_stargazers >= 500).sort((a, b) => b.ai_share_pct - a.ai_share_pct)
    const mostAI = sortedByShare[0]
    const mostTraditional = sortedByShare[sortedByShare.length - 1]

    return (
      <>
        <div className="gis-side-card">
          <div className="gis-side-title">Extremes</div>
          {mostAI && (
            <div className="gis-highlight">
              <span className="gis-highlight-icon">🟣</span>
              <div>
                <div className="gis-highlight-label">Most AI-leaning</div>
                <div className="gis-highlight-value">{COUNTRY_NAMES[mostAI.country_code] || mostAI.country_code} — {(mostAI.ai_share_pct * 100).toFixed(1)}%</div>
              </div>
            </div>
          )}
          {mostTraditional && (
            <div className="gis-highlight">
              <span className="gis-highlight-icon">🟠</span>
              <div>
                <div className="gis-highlight-label">Most traditional-leaning</div>
                <div className="gis-highlight-value">{COUNTRY_NAMES[mostTraditional.country_code] || mostTraditional.country_code} — {(mostTraditional.ai_share_pct * 100).toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>
        <div className="gis-side-card">
          <div className="gis-side-title">Top Countries by Activity</div>
          {topCountries.map((c, i) => (
            <div className="gis-rank-row" key={c.country_code}>
              <span className="gis-rank-num">#{i + 1}</span>
              <span className="gis-rank-name">{COUNTRY_NAMES[c.country_code] || c.country_code}</span>
              <span className="gis-rank-value">{c.total_stargazers.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="gis-side-card gis-side-card-note">
          <div className="gis-side-title">How to read this</div>
          <p><span className="gis-legend-swatch" style={{ background: '#F59E0B' }}></span> Amber = traditional data engineering tools lead.</p>
          <p><span className="gis-legend-swatch" style={{ background: '#8B5CF6' }}></span> Violet = AI-native tools lead. Unlit countries have no tracked data yet.</p>
        </div>
      </>
    )
  }

  return (
    <div className="gis-map-slide">
      <section className="explorer-section">
        <div className="eyebrow">🌐 AI Adoption Map · Where the Shift Is Happening</div>

        <div className="gis-stat-bar">
          <div className="gis-stat">
            <div className="gis-stat-value">{totalCountries || '—'}</div>
            <div className="gis-stat-label">Countries Tracked</div>
          </div>
          <div className="gis-stat">
            <div className="gis-stat-value">{globalAiShare ? `${globalAiShare}%` : '—'}</div>
            <div className="gis-stat-label">Global AI Share</div>
          </div>
          <div className="gis-stat">
            <div className="gis-stat-value">122</div>
            <div className="gis-stat-label">Repos Analyzed</div>
          </div>
          <div className="gis-stat gis-stat-live">
            <span className="gis-live-dot"></span>
            Updated daily via Airflow
          </div>
        </div>

        <div className="map-layer-toggle">
          {layers.map((layer) => (
            <button key={layer.id}
                    className={`layer-pill ${activeLayer === layer.id ? 'active' : ''} ${!layer.ready ? 'pending' : ''}`}
                    onClick={() => setActiveLayer(layer.id)}>
              <span className="layer-pill-icon">{layer.icon}</span>
              {layer.label}
              {!layer.ready && (
                <span className="layer-pill-badge">
                  {(layer.id === 'growth' || layer.id === 'career') && growthStatus ? `${growthStatus.days_of_history}/${growthStatus.threshold}` : 'soon'}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeLayer === 'per-tool' && toolList.length > 0 && (
          <div className="tool-selector">
            <label>Select a tool:</label>
            <select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)}>
              {toolList.map((t) => (
                <option key={t.repo_full_name} value={t.repo_full_name}>{getToolDisplayName(t.repo_full_name)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="gis-grid">
          <div className="gis-map-panel">
            {loading || !geoJson ? (
              <div className="layer-pending">
                <span className="layer-pending-icon">🌍</span>
                <div className="layer-pending-title">Loading live data…</div>
              </div>
            ) : mapReady ? (
              <>
                <MapContainer key={`map-${theme}`} center={[20, 10]} zoom={2} minZoom={2} maxBounds={[[-90, -180], [90, 180]]}
                              style={{ height: '440px', width: '100%', borderRadius: '10px', background: oceanColor }}
                              scrollWheelZoom={false}>
                  <GeoJSON key={`${activeLayer}-${selectedTool}-${theme}-${archetypeData.length}-${toolData.length}-${countryData.length}`} data={geoJson} style={styleFeature} onEachFeature={onEachFeature} />
                </MapContainer>
                {activeLayer === 'archetype' ? (
                  <div className="archetype-legend">
                    {Object.entries(ARCHETYPE_COLORS).map(([name, color]) => (
                      <div className="archetype-legend-item" key={name}>
                        <span className="archetype-legend-dot" style={{ background: color }}></span>
                        {name}
                      </div>
                    ))}
                  </div>
                ) : activeLayer === 'per-tool' ? (
                  <div className="gis-gradient-legend">
                    <span>Less popular</span>
                    <div className="gis-gradient-bar" style={{ background: 'linear-gradient(90deg, #1E293B, #8B5CF6)' }}></div>
                    <span>Most popular</span>
                  </div>
                ) : (
                  <div className="gis-gradient-legend">
                    <span>Traditional-leaning</span>
                    <div className="gis-gradient-bar"></div>
                    <span>AI-leaning</span>
                  </div>
                )}
              </>
            ) : (
              <div className="layer-pending">
                <span className="layer-pending-icon">⏳</span>
                <div className="layer-pending-title">Building history for this layer</div>
                <div className="layer-pending-sub">
                  Needs several days of accumulated daily snapshots before it can show a genuine result — updates automatically every day.
                </div>
              </div>
            )}
          </div>

          <div className="gis-side-panel">
            {renderSidePanel()}
          </div>
        </div>

        <div className="explorer-note">
          🔧 Live data from GitHub via OSS Insight, refreshed daily via Apache Airflow.
        </div>
      </section>
    </div>
  )
}

export default GisAiMapSlide