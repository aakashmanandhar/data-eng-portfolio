import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const CLUSTER_ICONS = {
  'Mainstream Global Tools': '🌐',
  'Apache Big-Data Ecosystem': '🪶',
  'Emerging & Community-Driven': '🌱',
  'Cloud-Warehouse Adapters': '☁️',
}
const MEDALS = ['🥇', '🥈', '🥉', '4️⃣']

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n
}

function OssLandscapeSlide() {
  const [landscape, setLandscape] = useState(null)
  const [gap, setGap] = useState(null)
  const [momentum, setMomentum] = useState(null)
  const [momentumDetail, setMomentumDetail] = useState(null)
  useEffect(() => {
    fetch(`${API_BASE}/api/oss-landscape-summary/`).then((r) => r.json()).then(setLandscape).catch(console.error)
    fetch(`${API_BASE}/api/sentiment-vs-adoption-gap/`).then((r) => r.json()).then(setGap).catch(console.error)
    fetch(`${API_BASE}/api/momentum-status/`).then((r) => r.json()).then(setMomentum).catch(console.error)
    fetch(`${API_BASE}/api/tool-momentum/`).then((r) => r.json()).then(setMomentumDetail).catch(console.error)
  }, [])

  if (!landscape) return null

  const sortedOrgs = [...landscape.org_landscape].sort((a, b) => b.aggregate_stars - a.aggregate_stars)
  const gapItems = gap?.gap_analysis || []
  const maxStars = Math.max(...gapItems.map((g) => g.github_stars), 1)
  const surveyRanked = [...gapItems].sort((a, b) => b.survey_usage_pct - a.survey_usage_pct).map((g) => g.tool)
  const starRanked = [...gapItems].sort((a, b) => b.github_stars - a.github_stars).map((g) => g.tool)

  return (
    <div className="so-survey-slide">
      <div className="org-archetype-intro">
        <span className="so-survey-stat-icon">🛰️</span>
        Which companies build the most-used tools, which tools are adopted together, and where GitHub "buzz" doesn't match real-world usage.
      </div>

      <div className="gis-stat-bar">
        <div className="gis-stat">
          <div className="gis-stat-value">{sortedOrgs.length}</div>
          <div className="gis-stat-label"><span className="so-survey-stat-icon">🏢</span>Orgs tracked</div>
        </div>
        <div className="gis-stat">
          <div className="gis-stat-value">{landscape.co_adoption_clusters.reduce((s, c) => s + c.repo_count, 0)}</div>
          <div className="gis-stat-label"><span className="so-survey-stat-icon">🧬</span>Tools clustered</div>
        </div>
        <div className="gis-stat">
          <div className="gis-stat-value">{gapItems.length}</div>
          <div className="gis-stat-label"><span className="so-survey-stat-icon">⚖️</span>Hype vs. reality checks</div>
        </div>
        <div className="gis-stat">
          <div className="gis-stat-value">{momentum?.ready ? '✅' : momentum ? `${momentum.days_of_history}/${momentum.threshold}` : '⏳'}</div>
          <div className="gis-stat-label"><span className="so-survey-stat-icon">📈</span>{momentum?.ready ? 'Momentum: ready' : 'Momentum: building history'}</div>
        </div>
      </div>

      <div className="oss-landscape-grid">
        <div className="gis-map-panel oss-card">
          <div className="so-survey-panel-title">🏆 Org leaderboard</div>
          <div className="oss-leaderboard">
            {sortedOrgs.map((org, i) => (
              <div key={org.org_name} className="oss-leaderboard-row">
                <span className="oss-medal">{MEDALS[i] || `${i + 1}️⃣`}</span>
                <span className="oss-org-name">{org.org_name}</span>
                <span className="oss-org-stars">⭐ {formatNum(org.aggregate_stars)}</span>
                <span className={`oss-org-growth ${org.star_growth > 0 ? 'up' : org.star_growth < 0 ? 'down' : ''}`}>
                  {org.star_growth > 0 ? '↑' : org.star_growth < 0 ? '↓' : '→'} +{org.star_growth}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="gis-map-panel oss-card">
          <div className="so-survey-panel-title">🧬 Tool families (by where they're adopted)</div>
          <div className="oss-cluster-list">
            {landscape.co_adoption_clusters.map((c) => (
              <div key={c.cluster_name} className="oss-cluster-row">
                <span className="oss-cluster-icon">{CLUSTER_ICONS[c.cluster_name] || '📦'}</span>
                <div className="oss-cluster-body">
                  <div className="oss-cluster-name">{c.cluster_name} <span className="oss-cluster-count">({c.repo_count})</span></div>
                  <div className="oss-cluster-tags">
                    {c.sample_repos.map((r) => (
                      <span key={r} className="oss-tag">{r.split('/')[1] || r}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gis-map-panel oss-card oss-card-wide">
          <div className="so-survey-panel-title">🔥 Hype vs. reality — real developer usage vs. GitHub stars</div>
          <div className="oss-gap-list">
            {gapItems.map((g) => {
              const surveyRank = surveyRanked.indexOf(g.tool)
              const starRank = starRanked.indexOf(g.tool)
              const overhyped = starRank < surveyRank
              const badge = overhyped ? '🔥 Overhyped' : starRank > surveyRank ? '💎 Underrated' : '⚖️ Balanced'
              return (
                <div key={g.tool} className="oss-gap-row">
                  <div className="oss-gap-name">
                    {g.tool}
                    <span className={`oss-gap-badge ${overhyped ? 'hot' : starRank > surveyRank ? 'gem' : 'even'}`}>{badge}</span>
                  </div>
                  <div className="oss-gap-bars">
                    <div className="oss-gap-bar-row">
                      <span className="oss-gap-bar-label">👥 Real usage</span>
                      <div className="oss-gap-bar-track"><div className="oss-gap-bar-fill usage" style={{ width: `${g.survey_usage_pct * 100}%` }} /></div>
                      <span className="oss-gap-bar-value">{Math.round(g.survey_usage_pct * 100)}%</span>
                    </div>
                    <div className="oss-gap-bar-row">
                      <span className="oss-gap-bar-label">⭐ GitHub buzz</span>
                      <div className="oss-gap-bar-track"><div className="oss-gap-bar-fill stars" style={{ width: `${(g.github_stars / maxStars) * 100}%` }} /></div>
                      <span className="oss-gap-bar-value">{formatNum(g.github_stars)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {momentumDetail && (
          <div className="gis-map-panel oss-card oss-card-wide">
            <div className="so-survey-panel-title">🚀 Tool momentum — where each tool is in its lifecycle</div>
            <div className="oss-momentum-grid">
              {[
                ['Emerging', '🌱', 'Small but growing'],
                ['Accelerating', '🔥', 'Established and speeding up'],
                ['Mature', '⚖️', 'Established and steady'],
                ['Declining', '📉', 'Flat or shrinking'],
              ].map(([stage, icon, desc]) => (
                <div key={stage} className="oss-momentum-col">
                  <div className="oss-momentum-col-header">
                    <span>{icon}</span> {stage} <span className="oss-cluster-count">({(momentumDetail[stage] || []).length})</span>
                  </div>
                  <div className="oss-momentum-col-desc">{desc}</div>
                  {(momentumDetail[stage] || []).slice(0, 4).map((t) => (
                    <div key={t.repo_full_name} className="oss-momentum-item">
                      <span className="oss-momentum-item-name">{t.repo_full_name.split('/')[1] || t.repo_full_name}</span>
                      <span className="oss-momentum-item-value">{t.avg_daily_growth > 0 ? '+' : ''}{t.avg_daily_growth}/day</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default OssLandscapeSlide