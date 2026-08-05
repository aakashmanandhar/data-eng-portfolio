import { useState, useEffect } from 'react'
import { MapContainer, GeoJSON } from 'react-leaflet'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend, ResponsiveContainer } from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const BAR_COLORS = ['#8B5CF6', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316']
const TOOL_ICONS = { language: '💻', database: '🗄️', platform: '☁️' }
const TOOL_SHORT_NAMES = {
  'Amazon Web Services (AWS)': 'AWS',
  'Microsoft SQL Server': 'MS SQL Server',
  'Google Cloud Platform': 'GCP',
  'Microsoft Azure': 'Azure',
}
const shortName = (name) => TOOL_SHORT_NAMES[name] || name
const GEOJSON_TO_CANONICAL = {
  'United States of America': 'United States',
  'Republic of Serbia': 'Serbia',
  'Macedonia': 'North Macedonia',
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="so-survey-tooltip">
      <div className="so-survey-tooltip-title">
        <span className="so-survey-tooltip-icon">{TOOL_ICONS[item.category] || '🔧'}</span>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="so-survey-tooltip-value" style={{ color: p.color }}>
          {p.name}: {p.value}{unit}
        </div>
      ))}
    </div>
  )
}

function SoSurveySlide() {
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [summary, setSummary] = useState(null)
  const [countryData, setCountryData] = useState(null)
  const [geoJson, setGeoJson] = useState(null)
  const [countryShapes, setCountryShapes] = useState({})
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    fetch('/world-countries.geo.json').then((res) => res.json()).then(setGeoJson)
    fetch('/country-shapes.json').then((res) => res.json()).then(setCountryShapes)
    fetch(`${API_BASE}/api/de-tool-summary/`)
      .then((res) => res.json())
      .then(setSummary)
      .catch((err) => console.error('Failed to load DE tool summary:', err))
  }, [])

  useEffect(() => {
    if (!selectedCountry) {
      setCountryData(null)
      return
    }
    fetch(`${API_BASE}/api/de-tool-by-country/?country=${encodeURIComponent(selectedCountry)}`)
      .then((res) => res.json())
      .then(setCountryData)
      .catch((err) => console.error('Failed to load country data:', err))
  }, [selectedCountry])

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => setSelectedCountry(GEOJSON_TO_CANONICAL[feature.properties.name] || feature.properties.name),
    })
  }

  const availableCountries = Object.keys(countryShapes).sort()
  const shapePath = selectedCountry ? countryShapes[selectedCountry] : null
  const activeData = selectedCountry ? countryData : summary

  const currentByTool = {}
  ;(selectedCountry ? countryData?.top_tools : summary?.top10_overall)?.forEach((t) => {
    currentByTool[t.canonical_tool] = Math.round(t.usage_pct * 100)
  })

  const chartData = (selectedCountry ? countryData?.top_tools : summary?.top10_overall || [])
    ?.slice(0, 10)
    .map((t) => ({ name: shortName(t.canonical_tool), value: Math.round(t.usage_pct * 100), category: t.tool_category })) || []

  const forecastComparisonData = (activeData?.forecast_trend || []).map((f) => ({
    name: shortName(f.canonical_tool),
    category: f.tool_category,
    current: currentByTool[f.canonical_tool] ?? 0,
    predicted: Math.round(f.predicted_next_year_usage_pct * 100),
  }))

  const trendData = (activeData?.trend_over_time?.points || []).map((p) => ({
    year: p.survey_year,
    value: Math.round(p.usage_pct * 1000) / 10,
  }))

  return (
    <div className="so-survey-slide" id="explorer">
      <div className="tool-selector so-survey-filter-row">
        <span>Filter by country</span>
        <select value={selectedCountry || ''} onChange={(e) => setSelectedCountry(e.target.value || null)}>
          <option value="">World</option>
          {availableCountries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {!selectedCountry && summary && (
        <div className="gis-stat-bar">
          <div className="gis-stat">
            <div className="gis-stat-value">{summary.summary.total_tool_selections?.toLocaleString()}</div>
            <div className="gis-stat-label"><span className="so-survey-stat-icon">👥</span>Total respondents</div>
          </div>
          <div className="gis-stat">
            <div className="gis-stat-value">{summary.summary.countries_covered}</div>
            <div className="gis-stat-label"><span className="so-survey-stat-icon">🌍</span>Countries covered</div>
          </div>
          <div className="gis-stat">
            <div className="gis-stat-value">{summary.summary.earliest_year}–{summary.summary.latest_year}</div>
            <div className="gis-stat-label"><span className="so-survey-stat-icon">📅</span>Years of data</div>
          </div>
          <div className="gis-stat">
            <div className="gis-stat-value">{summary.top10_overall?.[0]?.canonical_tool || '—'}</div>
            <div className="gis-stat-label"><span className="so-survey-stat-icon">🛠️</span>Top tool overall</div>
          </div>
        </div>
      )}

      {selectedCountry && countryData && (
        <div className="gis-stat-bar">
          <div className="gis-stat">
            <div className="gis-stat-value">{countryData.top_tools?.[0]?.total_respondents?.toLocaleString() || '—'}</div>
            <div className="gis-stat-label"><span className="so-survey-stat-icon">👥</span>Respondents</div>
          </div>
          <div className="gis-stat">
            <div className="gis-stat-value">{countryData.top_tools?.[0]?.canonical_tool || '—'}</div>
            <div className="gis-stat-label"><span className="so-survey-stat-icon">🛠️</span>Top tool</div>
          </div>
          <div className="gis-stat">
            <div className="gis-stat-value">{countryData.top_forecast?.canonical_tool || 'N/A'}</div>
            <div className="gis-stat-label"><span className="so-survey-stat-icon">📈</span>Predicted next leader</div>
          </div>
        </div>
      )}

      <div className="so-survey-grid">
        <div className="gis-map-panel so-survey-cell">
          <div className="so-survey-panel-title">{selectedCountry ? selectedCountry : 'World'}</div>
          <div className="so-survey-panel-body">
            {!selectedCountry ? (
              geoJson && (
                <MapContainer center={[20, 0]} zoom={1.3} style={{ height: '220px', width: '100%', borderRadius: '8px' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
                  <GeoJSON data={geoJson} onEachFeature={onEachFeature} style={{ fillColor: '#8B5CF6', fillOpacity: 0.25, color: '#8B5CF6', weight: 0.75 }} />
                </MapContainer>
              )
            ) : shapePath ? (
              <svg viewBox="0 0 200 140" className="so-survey-country-svg">
                <path d={shapePath} fill="rgba(139, 92, 246, 0.25)" stroke="#8B5CF6" strokeWidth="1.5" />
              </svg>
            ) : (
              <div className="so-survey-flag-badge">{selectedCountry}</div>
            )}
          </div>
        </div>

        <div className="gis-map-panel so-survey-cell">
          <div className="so-survey-panel-title"><span className="so-survey-stat-icon">📈</span>Current vs. predicted next year</div>
          <div className="so-survey-panel-body">
            {forecastComparisonData.length > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={forecastComparisonData} margin={{ left: 0, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" interval={0} tick={{ fill: 'var(--text)', fontSize: 10.5 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }} />
                  <Bar dataKey="current" name="Current" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="predicted" name="Predicted next yr" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="so-survey-custom-legend">
            <span><span className="so-survey-legend-dot" style={{ background: '#3B82F6' }} />Now</span>
            <span><span className="so-survey-legend-dot" style={{ background: '#8B5CF6' }} />Next yr</span>
          </div>
        </div>

        <div className="gis-map-panel so-survey-cell">
          <div className="so-survey-panel-title">{selectedCountry ? `Top DE tools — ${selectedCountry}` : 'Top DE tools worldwide'}</div>
          <div className="so-survey-panel-body">
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" interval={0} width={isMobile ? 60 : 85} tick={{ fill: 'var(--text)', fontSize: isMobile ? 9.5 : 10.5 }} />
                  <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="gis-map-panel so-survey-cell">
          <div className="so-survey-panel-title"><span className="so-survey-stat-icon">📉</span>{activeData?.trend_over_time?.tool || 'Top tool'} adoption over time</div>
          <div className="so-survey-panel-body">
            {trendData.length > 1 && (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ left: 0, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip unit="%" />} cursor={{ stroke: '#8B5CF6', strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="value" name="Usage %" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SoSurveySlide