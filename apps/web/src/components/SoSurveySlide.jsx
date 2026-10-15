import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Globe2, CalendarRange, Trophy, Info, X, MapPin, TrendingUp, TrendingDown, Minus, Sparkles, ChevronDown } from 'lucide-react'
import Globe, { prepareFeatures } from './Globe'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const SHORT = {
  'Amazon Web Services (AWS)': 'AWS',
  'Microsoft SQL Server': 'MS SQL Server',
  'Google Cloud Platform': 'GCP',
  'Microsoft Azure': 'Azure',
}
const shortName = (n) => SHORT[n] || n
const GEO_TO_CANON = {
  'United States of America': 'United States',
  'Republic of Serbia': 'Serbia',
  'Macedonia': 'North Macedonia',
}
const canon = (n) => GEO_TO_CANON[n] || n
const KIND = { language: 'Language', database: 'Database', platform: 'Cloud platform' }
const PURPLE = '#8B5CF6'

function TrendTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="gx-tip" style={{ position: 'static', transform: 'none' }}>
      <div className="gx-tip-title">{label}</div>
      <div className="gx-tip-line">{payload[0].value}% of developers</div>
    </div>
  )
}

function SoSurveySlide() {
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [summary, setSummary] = useState(null)
  const [countryData, setCountryData] = useState(null)
  const [features, setFeatures] = useState([])
  const [shapes, setShapes] = useState({})
  const [focus, setFocus] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch('/world-countries.geo.json').then((r) => r.json()).then((g) => setFeatures(prepareFeatures(g))).catch(() => {})
    fetch('/country-shapes.json').then((r) => r.json()).then(setShapes).catch(() => {})
    fetch(`${API_BASE}/api/de-tool-summary/`)
      .then((r) => r.json()).then(setSummary)
      .catch((err) => { console.error('Failed to load DE tool summary:', err); setFailed(true) })
  }, [])

  useEffect(() => {
    if (!selectedCountry) { setCountryData(null); return }
    setCountryData(null)
    fetch(`${API_BASE}/api/de-tool-by-country/?country=${encodeURIComponent(selectedCountry)}`)
      .then((r) => r.json()).then(setCountryData)
      .catch((err) => console.error('Failed to load country data:', err))
  }, [selectedCountry])

  const countries = useMemo(() => Object.keys(shapes).sort(), [shapes])
  const idByName = useMemo(() => {
    const m = {}
    features.forEach((f) => { m[canon(f.properties.name)] = f.id })
    return m
  }, [features])
  const nameById = useMemo(() => {
    const m = {}
    features.forEach((f) => { m[f.id] = canon(f.properties.name) })
    return m
  }, [features])
  const fills = useMemo(() => {
    const o = {}
    countries.forEach((c) => { if (idByName[c]) o[idByName[c]] = 'var(--gx-data)' })
    return o
  }, [countries, idByName])

  const choose = (name) => {
    setSelectedCountry(name || null)
    if (name && idByName[name]) setFocus({ id: idByName[name], n: Date.now() })
  }

  const activeData = selectedCountry ? countryData : summary
  const tools = (selectedCountry ? countryData?.top_tools : summary?.top10_overall) || []
  const top = tools.slice(0, 8).map((t) => ({
    name: shortName(t.canonical_tool), kind: KIND[t.tool_category] || 'Tool', value: Math.round(t.usage_pct * 100),
  }))
  const topMax = Math.max(1, ...top.map((t) => t.value))

  const nowBy = {}
  tools.forEach((t) => { nowBy[t.canonical_tool] = Math.round(t.usage_pct * 100) })
  const outlook = (activeData?.forecast_trend || []).map((f) => {
    const now = nowBy[f.canonical_tool] ?? 0
    const next = Math.round(f.predicted_next_year_usage_pct * 100)
    return { name: shortName(f.canonical_tool), now, next, delta: next - now }
  }).sort((a, b) => b.delta - a.delta).slice(0, 6)

  const trend = (activeData?.trend_over_time?.points || []).map((p) => ({
    year: p.survey_year, value: Math.round(p.usage_pct * 1000) / 10,
  }))
  const trendTool = activeData?.trend_over_time?.tool

  const s = summary?.summary
  const kpis = selectedCountry
    ? [
        { icon: Users, value: countryData?.top_tools?.[0]?.total_respondents?.toLocaleString() || '—', label: 'Developers surveyed' },
        { icon: Trophy, value: countryData?.top_tools?.[0] ? shortName(countryData.top_tools[0].canonical_tool) : '—', label: 'Most used tool' },
        { icon: Sparkles, value: countryData?.top_forecast ? shortName(countryData.top_forecast.canonical_tool) : 'N/A', label: 'Predicted next leader' },
      ]
    : [
        { icon: Users, value: s?.total_tool_selections?.toLocaleString() || '—', label: 'Tool choices recorded' },
        { icon: Globe2, value: s?.countries_covered ?? '—', label: 'Countries covered' },
        { icon: CalendarRange, value: s ? `${s.earliest_year}–${s.latest_year}` : '—', label: 'Survey years' },
        { icon: Trophy, value: summary?.top10_overall?.[0] ? shortName(summary.top10_overall[0].canonical_tool) : '—', label: 'Most used tool' },
      ]

  const tooltip = (f) => {
    const n = canon(f.properties.name)
    return (
      <>
        <div className="gx-tip-title">{n}</div>
        <div className={fills[f.id] ? 'gx-tip-line' : 'gx-tip-line muted'}>{fills[f.id] ? 'Click to see its tools' : 'No survey data'}</div>
      </>
    )
  }

  return (
    <div className="gx-slide gx-so" id="explorer">
      <div className="gx-head">
        <div>
          <div className="eyebrow gx-eyebrow">Developer Survey · What data engineers actually use</div>
          <p className="gx-sub">Years of Stack Overflow developer-survey answers, combined into one view. Pick a country to see which tools its developers rely on, and what is likely next year.</p>
        </div>
        <label className="gx-select gx-pick">
          <span>Country</span>
          <select value={selectedCountry || ''} onChange={(e) => choose(e.target.value)}>
            <option value="">Whole world</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className={`gx-kpis k${kpis.length}`}>
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div className="gx-kpi" key={k.label}>
              <span className="gx-kpi-ico"><Icon size={16} /></span>
              <div><div className="gx-kpi-val">{k.value}</div><div className="gx-kpi-lbl">{k.label}</div></div>
            </div>
          )
        })}
      </div>

      <div className="gx-grid">
        <div className="gx-col">
        <div className="gx-card gx-globe-card">
          {features.length === 0 ? (
            <div className="gx-globe-wrap gx-loading"><div className="gx-orb" /><span>Loading globe…</span></div>
          ) : (
            <Globe features={features} fills={fills} activeId={selectedCountry ? idByName[selectedCountry] : null}
              focus={focus} tooltip={tooltip} label="Globe of survey countries"
              onPick={(f) => { const n = nameById[f.id]; if (fills[f.id]) choose(n) }} />
          )}
          <div className="gx-legend">
            <div className="gx-dots">
              <span><i style={{ background: PURPLE }} />Country in the survey</span>
              <span><i style={{ background: 'var(--gx-nodata)' }} />No data</span>
            </div>
            <div className="gx-hint">Drag to spin · click a country</div>
          </div>
        </div>

        {trend.length > 1 && (
          <div className="gx-card">
            <div className="gx-card-title">{trendTool ? `${shortName(trendTool)} over the years` : 'Top tool over the years'}</div>
            <p className="gx-card-sub">Share of developers using it, per survey year.</p>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={trend} margin={{ left: -18, right: 8, top: 6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<TrendTip />} cursor={{ stroke: PURPLE, strokeWidth: 1 }} />
                <Line type="monotone" dataKey="value" stroke={PURPLE} strokeWidth={2.5} dot={{ r: 3, fill: PURPLE }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        </div>

        <div className="gx-side gx-so-side">
          {selectedCountry && (
            <div className="gx-card gx-sel">
              <button className="gx-sel-x" onClick={() => choose(null)} aria-label="Back to world view"><X size={14} /></button>
              <div className="gx-sel-name"><MapPin size={16} /> {selectedCountry}</div>
              <p className="gx-sel-text">Showing this country only. Press the cross to go back to the world.</p>
            </div>
          )}

          <div className="gx-card">
            <div className="gx-card-title">{selectedCountry ? `Most-used tools in ${selectedCountry}` : 'Most-used tools worldwide'}</div>
            <p className="gx-card-sub">Share of surveyed developers who use each tool.</p>
            {top.length === 0 && <p className="gx-sel-empty">{failed ? 'Live data is unavailable right now.' : 'Loading…'}</p>}
            <ol className="gx-bars">
              {top.map((t, i) => (
                <li key={t.name}>
                  <span className="gx-bars-name">{t.name}<em>{t.kind}</em></span>
                  <span className="gx-bars-track"><i style={{ width: `${(t.value / topMax) * 100}%`, '--i': i }} /></span>
                  <b>{t.value}%</b>
                </li>
              ))}
            </ol>
          </div>

          <div className="gx-card">
            <div className="gx-card-title">Outlook: now vs next year</div>
            <p className="gx-card-sub">A simple trend forecast. Arrows show the expected change in usage.</p>
            {outlook.length === 0 && <p className="gx-sel-empty">No forecast available.</p>}
            <ul className="gx-outlook">
              {outlook.map((o) => {
                const Ico = o.delta > 0 ? TrendingUp : o.delta < 0 ? TrendingDown : Minus
                return (
                  <li key={o.name} className={o.delta > 0 ? 'up' : o.delta < 0 ? 'down' : 'flat'}>
                    <span className="gx-outlook-name">{o.name}</span>
                    <span className="gx-outlook-nums">{o.now}% → {o.next}%</span>
                    <span className="gx-outlook-d"><Ico size={13} />{o.delta > 0 ? '+' : ''}{o.delta}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <details className="gx-card gx-how" open>
            <summary><Info size={14} /> How to read this <ChevronDown size={15} /></summary>
            <p>Each bar is the share of surveyed developers who said they use that tool.</p>
            <p>The outlook is a straight-line projection of past survey years, a guide rather than a promise.</p>
          </details>
        </div>
      </div>

      <div className="gx-foot">Source: Stack Overflow Developer Survey, processed with dbt and served from PostgreSQL.</div>
    </div>
  )
}

export default SoSurveySlide
