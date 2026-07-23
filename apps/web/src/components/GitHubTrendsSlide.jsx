import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie } from 'recharts'

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

function GitHubTrendsSlide() {
  const [repos, setRepos] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [orgs, setOrgs] = useState([])

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
        <div className="eyebrow">GitHub Trends · The Shift to AI Data Engineering</div>
        <div className="explorer-box">
          {aiTraditional.length > 0 && (
            <div className={`insight-banner insight-${leader}`}>
              <span className="insight-icon">{leader === 'ai' ? '🚀' : '🏗️'}</span>
              <span className="insight-text">
                <strong>{COHORT_LABELS[leader]}</strong> tools are leading right now — accumulating{' '}
                <strong>{Math.abs(aiLeadPct)}% {aiStars >= traditionalStars ? 'more' : 'fewer'} stars</strong>{' '}
                than {leader === 'ai' ? 'traditional tools' : 'AI-native tools'} across {aiTraditional.length} tracked repositories.
              </span>
            </div>
          )}

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
                      <Tooltip contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', fontSize: '12px' }} formatter={(v) => v.toLocaleString()} />
                    </PieChart>
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
                      <Tooltip contentStyle={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', fontSize: '12px' }} formatter={(v) => v.toLocaleString()} />
                    </PieChart>
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