import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Label, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { useCountUp } from '../utils/useCountUp'
import Sparkline from './Sparkline'
import LineageExplorer from './LineageExplorer'
import { Search } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function KpiTile({ label, value, prefix = '', suffix = '', sparklineData, icon, traceModel, onTrace }) {
  const animated = useCountUp(value)
  return (
    <div className="salary-kpi-tile">
      <div className="salary-kpi-tile-header">
        <span className="salary-kpi-tile-icon">{icon}</span>
        <span className="salary-kpi-tile-label">{label}</span>
        {traceModel && (
          <span className="agent-kpi-trace">
            <button className="agent-kpi-trace-icon" onClick={() => onTrace(traceModel)} aria-label="Trace where this number comes from">
              <Search size={14} />
            </button>
            <span className="agent-kpi-trace-tooltip">Trace where this number comes from</span>
          </span>
        )}
      </div>
      <div className="salary-kpi-tile-value">
        {prefix}{Math.round(animated).toLocaleString()}{suffix}
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <Sparkline data={sparklineData} color="var(--accent2)" />
      )}
    </div>
  )
}

function SalaryTrendsSlide() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)
  const [traceModel, setTraceModel] = useState(null)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const [kpi, setKpi] = useState(null)
  const [toolList, setToolList] = useState([])
  const [selectedTool, setSelectedTool] = useState('Python')
  const [toolData, setToolData] = useState(null)
  const [activeTab, setActiveTab] = useState('growth')
  const [skillGrowth, setSkillGrowth] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [forecastLevel, setForecastLevel] = useState('SE')
  const [archetypeData, setArchetypeData] = useState(null)
  const [predictorMeta, setPredictorMeta] = useState(null)
  const [predictorInputs, setPredictorInputs] = useState({ experience_level: 'SE', remote_ratio: 100, company_size: 'M', job_title: 'Data Engineer' })
  const [prediction, setPrediction] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/salary-kpi-summary/`).then((r) => r.json()).then(setKpi).catch(console.error)
    fetch(`${API_BASE}/api/salary-tool-list/`).then((r) => r.json()).then(setToolList).catch(console.error)
    fetch(`${API_BASE}/api/skill-salary-growth/`).then((r) => r.json()).then(setSkillGrowth).catch(console.error)
    fetch(`${API_BASE}/api/salary-forecast-multiyear/`).then((r) => r.json()).then(setForecastData).catch(console.error)
    fetch(`${API_BASE}/api/career-archetype-salary/`).then((r) => r.json()).then(setArchetypeData).catch(console.error)
    fetch(`${API_BASE}/api/salary-predictor-meta/`).then((r) => r.json()).then(setPredictorMeta).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedTool) return
    fetch(`${API_BASE}/api/salary-by-tool/?tool=${encodeURIComponent(selectedTool)}`)
      .then((r) => r.json()).then(setToolData).catch(console.error)
  }, [selectedTool])

  useEffect(() => {
    if (activeTab !== 'predictor' || !predictorMeta) return
    const params = new URLSearchParams(predictorInputs)
    fetch(`${API_BASE}/api/salary-predictor/?${params}`).then((r) => r.json()).then(setPrediction).catch(console.error)
  }, [predictorInputs, activeTab, predictorMeta])

  if (!kpi) {
    return (
      <div className="salary-slide">
        <div className="layer-pending">
          <span className="layer-pending-icon">💰</span>
          <div className="layer-pending-title">Loading salary data…</div>
        </div>
      </div>
    )
  }

  const seExperience = kpi.salary_by_experience.filter((d) => d.experience_level === 'SE')
  const medianSeSalary = seExperience.length > 0 ? seExperience[seExperience.length - 1].median_salary_usd : 0
  const seSparkline = seExperience.map((d) => d.median_salary_usd)

  const remoteByYear = {}
  kpi.remote_ratio_trend.forEach((d) => {
    remoteByYear[d.work_year] = remoteByYear[d.work_year] || { total: 0, remote: 0 }
    remoteByYear[d.work_year].total += Number(d.respondent_count)
    if (d.remote_ratio === 100) remoteByYear[d.work_year].remote += Number(d.respondent_count)
  })
  const remoteYears = Object.keys(remoteByYear).sort()
  const remoteSparkline = remoteYears.map((y) => (remoteByYear[y].remote / remoteByYear[y].total) * 100)
  const latestRemotePct = remoteSparkline.length > 0 ? remoteSparkline[remoteSparkline.length - 1] : 0

  const adoptionChartData = (toolData?.adoption_trend || []).map((d) => ({
    year: d.survey_year, pct: Math.round(d.usage_pct * 1000) / 10,
  }))
  const salaryChartData = (toolData?.salary_trend || []).map((d) => ({
    year: d.work_year, salary: Math.round(d.avg_salary_usd),
  }))

  // Build radar chart data: one row per dimension, one column per archetype, each normalized 0-100
  let radarChartData = []
  let archetypeNames = []
  if (archetypeData) {
    const byArchetype = {}
    archetypeData.forEach((d) => {
      byArchetype[d.archetype] = byArchetype[d.archetype] || { salaries: [], remotes: [], sizes: [] }
      byArchetype[d.archetype].salaries.push(Number(d.median_salary_usd))
      byArchetype[d.archetype].remotes.push(Number(d.avg_remote_ratio))
      byArchetype[d.archetype].sizes.push(Number(d.avg_company_size_score))
    })
    archetypeNames = Object.keys(byArchetype)
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
    const profiles = archetypeNames.map((name) => ({
      name,
      salary: avg(byArchetype[name].salaries),
      remote: avg(byArchetype[name].remotes),
      size: avg(byArchetype[name].sizes),
    }))
    const maxSalary = Math.max(...profiles.map((p) => p.salary))
    const maxRemote = 100
    const maxSize = 2
    radarChartData = [
      { dimension: 'Pay Level', ...Object.fromEntries(profiles.map((p) => [p.name, Math.round((p.salary / maxSalary) * 100)])) },
      { dimension: 'Remote-Friendly', ...Object.fromEntries(profiles.map((p) => [p.name, Math.round((p.remote / maxRemote) * 100)])) },
      { dimension: 'Company Scale', ...Object.fromEntries(profiles.map((p) => [p.name, Math.round((p.size / maxSize) * 100)])) },
    ]
  }

  const RADAR_COLORS = ['var(--accent1)', 'var(--accent2)', 'var(--green)', '#8B5CF6']

  return (
    <div className="salary-slide">
      <div className="salary-bento">
        <div className="salary-satellite-tiles">
          <KpiTile label="Median salary, all Senior roles" icon="💼" value={medianSeSalary} prefix="$" sparklineData={seSparkline} traceModel="fact_salary_by_experience" onTrace={setTraceModel} />
          <KpiTile label={`Fully remote roles, ${remoteYears[remoteYears.length - 1]}`} icon="🌍" value={latestRemotePct} suffix="%" sparklineData={remoteSparkline} traceModel="fact_remote_ratio_trend" onTrace={setTraceModel} />
          {kpi.top_paying_title && (
            <div className="salary-kpi-tile">
              <div className="salary-kpi-tile-header">
                <span className="salary-kpi-tile-icon">👑</span>
                <span className="salary-kpi-tile-label">Top paying title, {kpi.top_paying_title.work_year}</span>
              </div>
              <div className="salary-kpi-tile-value salary-kpi-tile-value-text">{kpi.top_paying_title.job_title}</div>
              <div className="salary-kpi-tile-subvalue">${Math.round(kpi.top_paying_title.avg_salary_usd).toLocaleString()}</div>
            </div>
          )}
        </div>

        <div className="salary-hero">
          <div className="salary-hero-header">
            <div className="salary-hero-title">🎯 Pick a skill — see adoption and salary trends side by side</div>
            <select className="salary-tool-picker" value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)}>
              {toolList.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div className="salary-hero-strips">
            <div className="salary-strip">
              <div className="salary-strip-label">📈 Real-world adoption (Stack Overflow Survey)</div>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={adoptionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 10.5 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 10.5 }} tickFormatter={(v) => `${v}%`} width={38} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Adoption']} contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="pct" stroke="var(--accent1)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="salary-strip">
              <div className="salary-strip-label">💰 Salary trend (average across roles using {selectedTool})</div>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={salaryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 10.5 }} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 10.5 }} tickFormatter={(v) => `$${Math.round(v / 1000)}K`} width={44} />
                  <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Avg salary']} contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="salary" stroke="var(--accent2)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          {toolData?.title_breakdown?.length > 0 && (
            <div className="salary-title-chips">
              {toolData.title_breakdown.map((t) => (
                <span key={t.job_title} className="salary-title-chip">
                  {t.job_title} <strong>${Math.round(t.avg_salary_usd / 1000)}K</strong>
                </span>
              ))}
            </div>
          )}
          <div className="salary-hero-microcopy">
            ⚠️ Correlation, not causation — this shows two real signals side by side. It doesn't claim learning {selectedTool} causes a specific salary, just what the data actually shows for people using it.
          </div>
        </div>

        <div className="salary-tabs">
          <div className="salary-tab-nav">
            {[
              { id: 'growth', label: '📊 Which Skills Pay Growing' },
              { id: 'forecast', label: '🔮 Future Salary Outlook' },
              { id: 'archetype', label: '🧭 Career Path Types' },
              { id: 'predictor', label: '🎯 Predict My Salary' },
            ].map((tab) => (
              <button key={tab.id} className={`salary-tab-pill ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'growth' && (
            <div className="salary-tab-panel">
              <div className="salary-tab-panel-desc">
                Each dot is a skill. Further right = its pay is rising faster year over year. Higher up = it already pays more today. Only skills with 4+ years of real history are shown — no guessing from too little data.
              </div>
              {skillGrowth && (
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" dataKey="growth_rate_per_year" name="Salary growth" tick={{ fill: 'var(--muted)', fontSize: 10.5 }} tickFormatter={(v) => `$${Math.round(v / 1000)}K/yr`}>
                      <Label value="Salary growth per year →" offset={-15} position="insideBottom" fill="var(--muted)" fontSize={11} />
                    </XAxis>
                    <YAxis type="number" dataKey="latest_salary" name="Current salary" tick={{ fill: 'var(--muted)', fontSize: 10.5 }} tickFormatter={(v) => `$${Math.round(v / 1000)}K`} width={50} />
                    <ZAxis range={[80, 80]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const d = payload[0].payload
                        return (
                          <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, fontSize: 12 }}>
                            <strong>{d.canonical_tool}</strong><br />
                            ${Math.round(d.latest_salary).toLocaleString()} today<br />
                            {d.growth_rate_per_year >= 0 ? '+' : ''}{Math.round(d.growth_rate_per_year).toLocaleString()}/yr growth
                          </div>
                        )
                      }}
                    />
                    <Scatter data={skillGrowth.filter((d) => d.status === 'ok')} fill="var(--accent2)" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {activeTab === 'forecast' && (
            <div className="salary-tab-panel">
              <div className="salary-tab-panel-desc">
                Forecast for <strong>{{ EN: 'Entry-level', MI: 'Mid-level', SE: 'Senior-level', EX: 'Executive-level' }[forecastLevel]}</strong> roles (across all job titles), based on real history, projected forward. The shaded band widens the further out we predict — that's honest: we're less certain about 2028 than 2026.
              </div>
              <div className="salary-level-picker">
                {['EN', 'MI', 'SE', 'EX'].map((lvl) => (
                  <button key={lvl} className={`salary-tab-pill ${forecastLevel === lvl ? 'active' : ''}`} onClick={() => setForecastLevel(lvl)}>
                    {{ EN: 'Entry', MI: 'Mid', SE: 'Senior', EX: 'Executive' }[lvl]}
                  </button>
                ))}
              </div>
              {forecastData?.[forecastLevel] && (
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
                  <AreaChart data={forecastData[forecastLevel].map((d) => ({
                    year: d.forecast_year, predicted: Math.round(d.predicted_salary),
                    lower: Math.round(d.lower_bound), upper: Math.round(d.upper_bound),
                  }))}>
                    <defs>
                      <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent2)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--accent2)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(v) => `$${Math.round(v / 1000)}K`} width={50} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null
                        const d = payload[0].payload
                        return (
                          <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, fontSize: 12 }}>
                            <strong>{label}</strong><br />
                            Predicted: ${d.predicted.toLocaleString()}<br />
                            Likely range: ${d.lower.toLocaleString()} – ${d.upper.toLocaleString()}
                          </div>
                        )
                      }}
                    />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="url(#forecastBand)" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="var(--bg-alt)" />
                    <Line type="monotone" dataKey="predicted" stroke="var(--accent2)" strokeWidth={3} dot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {activeTab === 'archetype' && archetypeData && (
            <div className="salary-tab-panel">
              <div className="salary-tab-panel-desc">
                Job titles grouped by their real pay, remote-friendliness, and typical company size — 4 real patterns found in how careers actually cluster, not assigned by hand.
              </div>
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                <RadarChart data={radarChartData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: 'var(--text)', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: 'var(--muted)', fontSize: 9 }} domain={[0, 100]} />
                  {archetypeNames.map((name, i) => (
                    <Radar key={name} name={name} dataKey={name} stroke={RADAR_COLORS[i % RADAR_COLORS.length]} fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Tooltip contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="salary-title-chips">
                {archetypeNames.map((name, i) => (
                  <span key={name} className="salary-title-chip" style={{ borderColor: RADAR_COLORS[i % RADAR_COLORS.length] }}>
                    <span style={{ color: RADAR_COLORS[i % RADAR_COLORS.length] }}>●</span> {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'predictor' && predictorMeta && (
            <div className="salary-tab-panel">
              <div className="salary-tab-panel-desc">
                Tell us about a role, get a real prediction from a model trained on {predictorMeta.trained_on_rows?.toLocaleString()} real respondents.
              </div>
              <div className="salary-predictor-form">
                <div className="salary-predictor-field">
                  <label>Experience level</label>
                  <div className="salary-level-picker">
                    {['EN', 'MI', 'SE', 'EX'].map((lvl) => (
                      <button key={lvl} className={`salary-tab-pill ${predictorInputs.experience_level === lvl ? 'active' : ''}`}
                              onClick={() => setPredictorInputs({ ...predictorInputs, experience_level: lvl })}>
                        {{ EN: 'Entry', MI: 'Mid', SE: 'Senior', EX: 'Executive' }[lvl]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="salary-predictor-field">
                  <label>Remote work: {{ 0: 'Fully onsite', 50: 'Hybrid', 100: 'Fully remote' }[predictorInputs.remote_ratio]}</label>
                  <input type="range" min="0" max="100" step="50" value={predictorInputs.remote_ratio}
                         onChange={(e) => setPredictorInputs({ ...predictorInputs, remote_ratio: Number(e.target.value) })}
                         className="salary-slider" />
                </div>
                <div className="salary-predictor-field">
                  <label>Company size</label>
                  <div className="salary-level-picker">
                    {['S', 'M', 'L'].map((sz) => (
                      <button key={sz} className={`salary-tab-pill ${predictorInputs.company_size === sz ? 'active' : ''}`}
                              onClick={() => setPredictorInputs({ ...predictorInputs, company_size: sz })}>
                        {{ S: 'Small', M: 'Medium', L: 'Large' }[sz]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="salary-predictor-field">
                  <label>Job title</label>
                  <select className="salary-tool-picker" value={predictorInputs.job_title}
                          onChange={(e) => setPredictorInputs({ ...predictorInputs, job_title: e.target.value })}>
                    {predictorMeta.available_titles?.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
              </div>
              {prediction && !prediction.error && (
                <div className="salary-prediction-result">
                  <div className="salary-prediction-summary">
                    Predicted salary for a {{ EN: 'Entry-level', MI: 'Mid-level', SE: 'Senior-level', EX: 'Executive-level' }[predictorInputs.experience_level]} {predictorInputs.job_title}, {{ 0: 'onsite', 50: 'hybrid', 100: 'remote' }[predictorInputs.remote_ratio]}, at a {{ S: 'small', M: 'medium', L: 'large' }[predictorInputs.company_size]} company:
                  </div>
                  <div className="salary-prediction-value">${Math.round(prediction.predicted_salary).toLocaleString()}</div>
                  <div className="salary-prediction-context">
                    Based on similar real profiles. This model explains about {Math.round(prediction.r_squared * 100)}% of salary differences — real predictions typically vary by roughly ±${Math.round(prediction.mae_usd).toLocaleString()}, since salary depends on many more factors (location, specific company, negotiation) than we can capture here.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {traceModel && <LineageExplorer modelName={traceModel} onClose={() => setTraceModel(null)} />}
    </div>
  )
}

export default SalaryTrendsSlide