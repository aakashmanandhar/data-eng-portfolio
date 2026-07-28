import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie } from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const COHORT_LABELS = {
  ai: 'AI Data Engineering',
  traditional: 'Traditional Data Engineering',
}
const COHORT_COLORS = {
  ai: '#8B5CF6',
  traditional: '#2563EB',
}
const ORG_INFO = {
  apache: { name: 'Apache Software Foundation', desc: 'Airflow, Spark, Kafka & more' },
  'dbt-labs': { name: 'dbt Labs', desc: 'Creators of dbt' },
  airbytehq: { name: 'Airbyte', desc: 'Open-source data integration' },
  astronomer: { name: 'Astronomer', desc: 'Managed Airflow platform' },
}
const DONUT_COLORS = ['#2563EB', '#06B6D4', '#8B5CF6', '#F59E0B']

const CLOUD_ICONS = {
  AWS: '/icons/aws.svg',
  AZURE: '/icons/azure.svg',
  GCP: '/icons/gcp.svg',
}
const PLATFORM_ICONS = {
  Databricks: 'https://cdn.simpleicons.org/databricks/FF3621',
  Snowflake: 'https://cdn.simpleicons.org/snowflake/29B5E8',
}

function EmptyChartState({ icon, title, subtitle }) {
  return (
    <div className="empty-chart">
      <svg className="empty-chart-svg" viewBox="0 0 400 160" preserveAspectRatio="none">
        <line x1="30" y1="10" x2="30" y2="140" stroke="var(--border)" strokeWidth="1" />
        <line x1="30" y1="140" x2="390" y2="140" stroke="var(--border)" strokeWidth="1" />
        {[35, 70, 105].map((y) => (
          <line key={y} x1="30" y1={y} x2="390" y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
        ))}
        <path d="M 30 130 Q 120 100, 210 90 T 390 60" fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="6 5" opacity="0.5" />
      </svg>
      <div className="empty-chart-overlay">
        <span className="empty-chart-icon">{icon}</span>
        <div className="empty-chart-title">{title}</div>
        {subtitle && <div className="empty-chart-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}

function GitHubTrendsSlide() {
  const [repos, setRepos] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [orgs, setOrgs] = useState([])
  const [forecast, setForecast] = useState([])
  const [githubPipelineRuns, setGithubPipelineRuns] = useState([])
  const [cohortTrend, setCohortTrend] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/api/pipeline-runs/?pipeline=github_trends`)
      .then((res) => res.json())
      .then(setGithubPipelineRuns)
      .catch((err) => console.error('Failed to load pipeline runs:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/ai-adoption-forecast/`)
      .then((res) => res.json())
      .then(setForecast)
      .catch((err) => console.error('Failed to load forecast:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/github-cohort-trend/`)
      .then((res) => res.json())
      .then(setCohortTrend)
      .catch((err) => console.error('Failed to load cohort trend:', err))
  }, [])

  const getForecastContext = (f) => {
    if (!f || f.length === 0) return null
    if (f[0].status === 'insufficient_data') return null

    const ai = f.find((c) => c.cohort === 'ai')
    const trad = f.find((c) => c.cohort === 'traditional')
    if (!ai || !trad) return null

    const aiRate = ai.daily_growth_rate
    const tradRate = trad.daily_growth_rate
    const faster = aiRate > tradRate ? 'AI-native' : 'traditional'
    const gap = Math.abs(aiRate - tradRate)

    if (ai.crossover_days_from_now) {
      const days = Math.round(ai.crossover_days_from_now)
      return `Based on the last ${ai.days_of_history} days, ${faster} tooling is growing roughly ${gap.toLocaleString()} more stars per day than the other cohort. If this holds, the two trend lines would cross in about ${days} day${days !== 1 ? 's' : ''}.`
    }

    return `Based on the last ${ai.days_of_history} days, ${faster} tooling is growing faster (+${aiRate.toLocaleString()}/day vs. +${tradRate.toLocaleString()}/day for the other cohort) — but the two aren't on a path to cross within the current forecast window.`
  }

  const getPlainSummary = (f) => {
    if (!f || f.length === 0) return null
    if (f[0].status === 'insufficient_data') return null

    const ai = f.find((c) => c.cohort === 'ai')
    const trad = f.find((c) => c.cohort === 'traditional')
    if (!ai || !trad) return null

    const faster = ai.daily_growth_rate > trad.daily_growth_rate ? 'AI-focused' : 'traditional'
    const slower = faster === 'AI-focused' ? 'traditional' : 'AI-focused'

    if (ai.crossover_days_from_now) {
      const days = Math.round(ai.crossover_days_from_now)
      return `${faster} tools (like LangChain) are gaining popularity on GitHub faster than ${slower} tools (like Airflow). If that pace continues, ${faster} tools could pull ahead in total popularity in about ${days} days.`
    }
    return `${faster} tools are currently gaining popularity faster than ${slower} tools, though they're not on track to overtake them within the near-term forecast window.`
  }

const buildForecastChartData = (trend, forecastData) => {
    const ai = forecastData.find((c) => c.cohort === 'ai')
    const trad = forecastData.find((c) => c.cohort === 'traditional')
    if (!ai || !trad) return []

    const byDate = {}
    trend.forEach((row) => {
      if (!byDate[row.snapshot_date]) byDate[row.snapshot_date] = { date: row.snapshot_date }
      byDate[row.snapshot_date][row.cohort === 'ai' ? 'aiActual' : 'tradActual'] = Number(row.total_stars)
    })
    const historical = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    if (historical.length === 0) return []

    const aiBase = historical[0].aiActual
    const tradBase = historical[0].tradActual
    const toPct = (val, base) => (base ? ((val - base) / base) * 100 : 0)

    const historicalPct = historical.map((row) => ({
      date: row.date,
      aiActualPct: row.aiActual != null ? toPct(row.aiActual, aiBase) : undefined,
      tradActualPct: row.tradActual != null ? toPct(row.tradActual, tradBase) : undefined,
    }))

    const lastPoint = historical[historical.length - 1]
    const bridge = {
      date: lastPoint.date,
      aiActualPct: toPct(lastPoint.aiActual, aiBase),
      tradActualPct: toPct(lastPoint.tradActual, tradBase),
      aiProjectedPct: toPct(ai.current_stars, aiBase),
      tradProjectedPct: toPct(trad.current_stars, tradBase),
    }

    const projected = []
    for (let i = 1; i <= 14; i++) {
      const d = new Date(lastPoint.date)
      d.setDate(d.getDate() + i)
      const aiVal = ai.current_stars + ai.daily_growth_rate * i
      const tradVal = trad.current_stars + trad.daily_growth_rate * i
      projected.push({
        date: d.toISOString().slice(0, 10),
        aiProjectedPct: toPct(aiVal, aiBase),
        tradProjectedPct: toPct(tradVal, tradBase),
      })
    }

    return [...historicalPct.slice(0, -1), bridge, ...projected]
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/github-repos/`)
      .then((res) => res.json())
      .then(setRepos)
      .catch((err) => console.error('Failed to load GitHub repos:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/github-platforms/`)
      .then((res) => res.json())
      .then(setPlatforms)
      .catch((err) => console.error('Failed to load platform data:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/github-orgs/`)
      .then((res) => res.json())
      .then(setOrgs)
      .catch((err) => console.error('Failed to load org data:', err))
  }, [])

  const aiTraditional = repos.filter((r) => r.cohort === 'ai' || r.cohort === 'traditional')
  const aiRepos = aiTraditional.filter((r) => r.cohort === 'ai')
  const traditionalRepos = aiTraditional.filter((r) => r.cohort === 'traditional')
  const latestSnapshot = repos.length > 0
    ? repos.reduce((latest, r) => (r.latest_snapshot_date > latest ? r.latest_snapshot_date : latest), repos[0].latest_snapshot_date)
    : null

  const aiStars = aiRepos.reduce((sum, r) => sum + r.stars, 0)
  const traditionalStars = traditionalRepos.reduce((sum, r) => sum + r.stars, 0)
  const aiLeadPct = traditionalStars > 0 ? Math.round(((aiStars - traditionalStars) / traditionalStars) * 100) : 0
  const leader = aiStars >= traditionalStars ? 'ai' : 'traditional'

  const cohortChartData = [
    { cohort: 'ai', label: 'AI-Native', stars: aiStars },
    { cohort: 'traditional', label: 'Traditional', stars: traditionalStars },
  ]

  const topByStars = [...aiTraditional].sort((a, b) => b.stars - a.stars).slice(0, 5)
  const topByContributors = [...aiTraditional]
    .filter((r) => r.contributor_count)
    .sort((a, b) => b.contributor_count - a.contributor_count)
    .slice(0, 5)

  const groupByCohort = (list) => {
    const grouped = {}
    list.forEach((r) => {
      if (!grouped[r.cohort]) grouped[r.cohort] = { cohort: r.cohort, stars: 0 }
      grouped[r.cohort].stars += r.stars
    })
    return Object.values(grouped)
  }

  const cloudChartData = groupByCohort(platforms.filter((p) => p.cohort.startsWith('cloud-')))
    .map((d) => ({ ...d, label: d.cohort.replace('cloud-', '').toUpperCase() }))
  const platformChartData = groupByCohort(platforms.filter((p) => p.cohort.startsWith('platform-')))
    .map((d) => ({ ...d, label: d.cohort.replace('platform-', '').charAt(0).toUpperCase() + d.cohort.replace('platform-', '').slice(1) }))

  const withPercentages = (data) => {
    const total = data.reduce((sum, d) => sum + d.stars, 0)
    return data.map((d) => ({ ...d, pct: total > 0 ? Math.round((d.stars / total) * 100) : 0 }))
  }
  const cloudDonutData = withPercentages(cloudChartData)
  const platformDonutData = withPercentages(platformChartData)
  const cloudTotal = cloudChartData.reduce((sum, d) => sum + d.stars, 0)
  const platformTotal = platformChartData.reduce((sum, d) => sum + d.stars, 0)

  return (
    <div className="github-trends-slide">
      <section className="explorer-section">
        <div className="eyebrow">🔮 AI Adoption Forecast</div>
        <div className="explorer-box">
          {forecast.length > 0 && forecast[0].status !== 'insufficient_data' && (
            <div className="plain-summary">
              <span className="plain-summary-icon">💡</span>
              <div>
                <div className="plain-summary-label">In plain terms</div>
                <div className="plain-summary-text">{getPlainSummary(forecast)}</div>
              </div>
            </div>
          )}

          <details className="tech-detail">
            <summary>Technical detail</summary>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', lineHeight: 1.6 }}>
              A live forecast model (scikit-learn linear regression) trained daily on combined GitHub star growth,
              arXiv publication volume, and Hacker News discussion volume — projecting when AI-native tooling
              might overtake traditional tooling, if current trends hold.
            </p>
          </details>

          {forecast.length > 0 && forecast[0].status === 'insufficient_data' ? (
            <EmptyChartState
              icon="⏳"
              title={`Building history — ${forecast[0].days_of_history} of ${forecast[0].days_required} days`}
              subtitle="The forecast chart activates automatically once enough real data accumulates."
            />
          ) : forecast.length > 0 ? (
            <div className="forecast-cards">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={buildForecastChartData(cohortTrend, forecast)} margin={{ left: 10, right: 10, top: 10 }}>
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} fontSize={10} stroke="var(--muted)" />
                  <YAxis fontSize={10} stroke="var(--muted)" tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`} width={55} />
                  <Tooltip contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', fontSize: '12px' }} formatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`} />
                  <Line type="monotone" dataKey="aiActualPct" stroke={COHORT_COLORS.ai} strokeWidth={2.2} dot={false} name="AI Tools" connectNulls />
                  <Line type="monotone" dataKey="aiProjectedPct" stroke={COHORT_COLORS.ai} strokeWidth={2} strokeDasharray="5 4" dot={false} name="AI (projected)" connectNulls />
                  <Line type="monotone" dataKey="tradActualPct" stroke={COHORT_COLORS.traditional} strokeWidth={2.2} dot={false} name="Traditional" connectNulls />
                  <Line type="monotone" dataKey="tradProjectedPct" stroke={COHORT_COLORS.traditional} strokeWidth={2} strokeDasharray="5 4" dot={false} name="Traditional (projected)" connectNulls />
                </LineChart>
              </ResponsiveContainer>
               <div className="chart-caption">
                Shows % growth from each cohort's own starting point — easier to compare pace than raw star counts. Solid = actual, dashed = projected if the pace holds.
              </div>
              <div className="forecast-cards-row">
                {forecast.map((f) => (
                  <div className={`forecast-card cohort-${f.cohort}`} key={f.cohort}>
                    <div className="forecast-card-label">
                      {f.cohort === 'ai' ? '🤖 AI Tools' : '🏗️ Traditional Tools'}
                    </div>
                    <div className="forecast-card-rate">{f.daily_growth_rate > 0 ? '+' : ''}{f.daily_growth_rate}/day</div>
                    <div className="forecast-card-plain">gaining ~{Math.abs(Math.round(f.daily_growth_rate))} new stars every day</div>
                    <div className="forecast-card-sub">R² = {f.r_squared} <span className="forecast-card-sub-hint">(fit confidence)</span></div>
                  </div>
                ))}
              </div>
              {forecast[0]?.crossover_days_from_now && (
                <div className="forecast-crossover">
                  📍 At this pace, AI tools could become more popular than traditional tools in ~{Math.round(forecast[0].crossover_days_from_now)} days
                </div>
              )}
              <div className="forecast-context">
                <span className="forecast-context-label">What this means:</span> {getForecastContext(forecast)}
              </div>
            </div>
          ) : (
            <EmptyChartState icon="📊" title="No forecast data available yet" />
          )}
        </div>
      </section>

      <section className="explorer-section">
        <div className="eyebrow">GitHub Trends · The Shift to AI Data Engineering</div>
        <div className="explorer-box">

          <div className="cohort-vs-row">
            {cohortChartData.map((d) => (
              <div className={`cohort-card cohort-${d.cohort}`} key={d.cohort}>
                <div className="cohort-card-label">{d.label}</div>
                <div className="cohort-card-value">{d.stars.toLocaleString()}</div>
                <div className="cohort-card-sublabel">total stars</div>
              </div>
            ))}
          </div>

          {cohortChartData.some((d) => d.stars > 0) && (
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={cohortChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="label" type="category" stroke="var(--muted)" fontSize={12} width={90} />
                <Tooltip contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', fontSize: '12px' }} formatter={(v) => v.toLocaleString()} />
                <Bar dataKey="stars" radius={[0, 8, 8, 0]} barSize={24}>
                  {cohortChartData.map((entry, i) => (
                    <Cell key={i} fill={COHORT_COLORS[entry.cohort]} />
                  ))}
                  <LabelList dataKey="stars" position="right" formatter={(v) => v.toLocaleString()} style={{ fontSize: 12, fill: 'var(--text)', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {latestSnapshot && (
            <div className="explorer-note">
              🔧 Live data from GitHub's API, refreshed daily via Apache Airflow. Last snapshot: {new Date(latestSnapshot).toLocaleDateString()}
            </div>
          )}
        </div>
      </section>

      <section className="dual-charts-section">
        <div className="dual-col">
          <div className="eyebrow">🔥 Most Popular (by Stars)</div>
          <div className="explorer-box">
            {topByStars.map((r, i) => (
              <div className="leaderboard-row" key={r.repo_full_name}>
                <span className="leaderboard-rank">#{i + 1}</span>
                <span className={`leaderboard-dot cohort-dot-${r.cohort}`}></span>
                <span className="leaderboard-name">{r.repo_full_name}</span>
                <span className="leaderboard-value">{r.stars.toLocaleString()}</span>
              </div>
            ))}
            {latestSnapshot && (
              <div className="explorer-note">
                🔧 Last snapshot: {new Date(latestSnapshot).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        <div className="dual-col">
          <div className="eyebrow">🛠️ Most Actively Built (by Contributors)</div>
          <div className="explorer-box">
            {topByContributors.map((r, i) => (
              <div className="leaderboard-row" key={r.repo_full_name}>
                <span className="leaderboard-rank">#{i + 1}</span>
                <span className={`leaderboard-dot cohort-dot-${r.cohort}`}></span>
                <span className="leaderboard-name">{r.repo_full_name}</span>
                <span className="leaderboard-value">{r.contributor_count.toLocaleString()}</span>
              </div>
            ))}
            {latestSnapshot && (
              <div className="explorer-note">
                🔧 Last snapshot: {new Date(latestSnapshot).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dual-charts-section">
        <div className="dual-col">
          <div className="eyebrow">☁️ Cloud Platform Popularity</div>
          <div className="explorer-box">
            {cloudDonutData.length > 0 && (
              <>
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={cloudDonutData} dataKey="stars" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={2}>
                        {cloudDonutData.map((entry, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                  <Tooltip position={{ x: 0, y: 0 }} contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', fontSize: '12px' }} formatter={(v) => v.toLocaleString()} />                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center-label">
                    <div className="donut-center-value">
                      <span className="donut-star-icon">★</span>
                      {cloudTotal.toLocaleString()}
                    </div>
                    <div className="donut-center-sub">Total Stars</div>
                  </div>
                </div>
                <div className="donut-legend">
                  {cloudDonutData.map((d, i) => (
                    <div className="donut-legend-row" key={d.label}>
                      <span className="donut-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}></span>
                      {CLOUD_ICONS[d.label] && <img src={CLOUD_ICONS[d.label]} alt={d.label} className="donut-legend-icon" />}
                      <span className="donut-legend-name">{d.label}</span>
                      <span className="donut-legend-pct">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {latestSnapshot && (
              <div className="explorer-note">
                🔧 Last snapshot: {new Date(latestSnapshot).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        <div className="dual-col">
          <div className="eyebrow">🏔️ Databricks vs Snowflake</div>
          <div className="explorer-box">
            {platformDonutData.length > 0 && (
              <>
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={platformDonutData} dataKey="stars" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={2}>
                        {platformDonutData.map((entry, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                  <Tooltip position={{ x: 0, y: 0 }} contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', fontSize: '12px' }} formatter={(v) => v.toLocaleString()} />                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center-label">
                    <div className="donut-center-value">
                      <span className="donut-star-icon">★</span>
                      {platformTotal.toLocaleString()}
                    </div>
                    <div className="donut-center-sub">Total Stars</div>
                  </div>
                </div>
                <div className="donut-legend">
                  {platformDonutData.map((d, i) => (
                    <div className="donut-legend-row" key={d.label}>
                      <span className="donut-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}></span>
                      {PLATFORM_ICONS[d.label] && <img src={PLATFORM_ICONS[d.label]} alt={d.label} className="donut-legend-icon" />}
                      <span className="donut-legend-name">{d.label}</span>
                      <span className="donut-legend-pct">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {latestSnapshot && (
              <div className="explorer-note">
                🔧 Last snapshot: {new Date(latestSnapshot).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="explorer-section">
        <div className="eyebrow">🏢 Org Activity</div>
        <div className="explorer-box">
          <div className="org-card-grid">
            {orgs.map((org) => {
              const info = ORG_INFO[org.org_name] || { name: org.org_name, desc: '' }
              return (
                <div className="org-card" key={org.org_name}>
                  <div className="org-card-name">{info.name}</div>
                  {info.desc && <div className="org-card-desc">{info.desc}</div>}
                  <div className="org-card-stars">{org.aggregate_stars.toLocaleString()} ★</div>
                  <div className="org-card-repos">{org.total_public_repos.toLocaleString()} public repos</div>
                </div>
              )
            })}
          </div>
          <div className="explorer-note">
            🔧 Aggregate stars and repo counts across each org's full public repository list. {latestSnapshot && `Last snapshot: ${new Date(latestSnapshot).toLocaleDateString()}`}
          </div>
        </div>
      </section>
    </div>
  )
}

export default GitHubTrendsSlide