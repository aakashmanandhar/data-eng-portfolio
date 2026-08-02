import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const ARCHETYPE_ICONS = {
  'Cloud-Native Lakehouse Teams': '☁️',
  'Airflow-Orchestrated Warehouse Teams': '🔄',
  'Custom-Tooling Warehouse Teams': '🧰',
  'Ad-Hoc Warehouse Teams': '📦',
}

const ARCHETYPE_DESCRIPTIONS = {
  'Cloud-Native Lakehouse Teams': 'Larger teams running a modern "lakehouse" setup, automated with cloud-managed tools (like AWS or Google Cloud\'s built-in schedulers). They already use AI for everyday tasks, but older legacy systems still slow them down.',
  'Airflow-Orchestrated Warehouse Teams': 'The single most common team type. They run a traditional data warehouse, automated with the industry-standard tool Apache Airflow. AI is used for specific tasks day-to-day, and legacy systems are their top challenge too.',
  'Custom-Tooling Warehouse Teams': 'Similar to the Airflow group — a traditional warehouse setup — but automated with a different, more specialized tool (Prefect) instead of the industry standard. Same AI usage and challenges as the Airflow group.',
  'Ad-Hoc Warehouse Teams': 'Teams with no formal automation in place yet — pipelines are run manually or ad-hoc. They\'re earlier in their AI journey (still experimenting rather than using it daily), and their biggest blocker is unclear leadership direction, not technology.',
}

const AI_STAGE_ORDER = [
  { key: 'No meaningful adoption yet', short: 'Not using AI', icon: '🚫' },
  { key: 'Experimenting', short: 'Experimenting', icon: '🧪' },
  { key: 'Using AI for tactical tasks', short: 'Using it day-to-day', icon: '🔧' },
  { key: 'Building internal AI platforms', short: 'Building AI platforms', icon: '🏗️' },
  { key: 'AI embedded in most workflows', short: 'Fully embedded', icon: '🤖' },
]

function OrgArchetypeSlide() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/org-archetype-summary/`)
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error('Failed to load org archetype summary:', err))
  }, [])

  if (!data) return null

  const countByStage = {}
  data.ai_adoption_breakdown.forEach((d) => { countByStage[d.ai_adoption] = d.count })
  const maxCount = Math.max(...data.ai_adoption_breakdown.map((d) => d.count))

  return (
    <div className="so-survey-slide">
      <div className="org-archetype-intro">
        <span className="so-survey-stat-icon">📋</span>
        Based on a 2026 survey of 1,100 real data teams worldwide, here's how different types of teams are organized — and how far along they are with AI.
      </div>

      <div className="gis-stat-bar">
        <div className="gis-stat">
          <div className="gis-stat-value">{data.total_respondents.toLocaleString()}</div>
          <div className="gis-stat-label"><span className="so-survey-stat-icon">👥</span>Teams surveyed</div>
        </div>
        <div className="gis-stat">
          <div className="gis-stat-value">{data.archetypes.length}</div>
          <div className="gis-stat-label"><span className="so-survey-stat-icon">🧩</span>Common team types</div>
        </div>
        <div className="gis-stat">
          <div className="gis-stat-value">{data.archetypes[0]?.archetype_name.split(' ')[0]}</div>
          <div className="gis-stat-label"><span className="so-survey-stat-icon">🏆</span>Most common type</div>
        </div>
      </div>

      <div className="org-archetype-grid">
        {data.archetypes.map((a) => (
          <div key={a.archetype_name} className="gis-map-panel org-archetype-card">
            <div className="org-archetype-card-header">
              <span className="org-archetype-icon">{ARCHETYPE_ICONS[a.archetype_name] || '📊'}</span>
              <div>
                <div className="org-archetype-name">{a.archetype_name}</div>
                <div className="org-archetype-count">{a.respondent_count} teams ({Math.round((a.respondent_count / data.total_respondents) * 100)}%)</div>
              </div>
            </div>
            <p className="org-archetype-description">{ARCHETYPE_DESCRIPTIONS[a.archetype_name] || ''}</p>
          </div>
        ))}
      </div>

      <div className="gis-map-panel so-survey-forecast-panel">
        <div className="so-survey-panel-title"><span className="so-survey-stat-icon">🤖</span>Where teams are on their AI journey</div>
        <div className="ai-journey-stepper">
          {AI_STAGE_ORDER.map((stage, i) => {
            const count = countByStage[stage.key] || 0
            const pct = Math.round((count / data.total_respondents) * 100)
            return (
              <div key={stage.key} className="ai-journey-step">
                <div className="ai-journey-icon">{stage.icon}</div>
                <div className="ai-journey-bar-track">
                  <div className="ai-journey-bar-fill" style={{ height: `${Math.max(8, (count / maxCount) * 100)}%` }} />
                </div>
                <div className="ai-journey-count">{count}</div>
                <div className="ai-journey-pct">{pct}%</div>
                <div className="ai-journey-label">{stage.short}</div>
                {i < AI_STAGE_ORDER.length - 1 && <div className="ai-journey-arrow">→</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default OrgArchetypeSlide