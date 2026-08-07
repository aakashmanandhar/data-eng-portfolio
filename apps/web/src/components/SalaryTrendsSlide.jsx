import { useState, useEffect } from 'react'
import { useCountUp } from '../utils/useCountUp'
import Sparkline from './Sparkline'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function KpiTile({ label, value, prefix = '', suffix = '', sparklineData, icon }) {
  const animated = useCountUp(value)
  return (
    <div className="salary-kpi-tile">
      <div className="salary-kpi-tile-header">
        <span className="salary-kpi-tile-icon">{icon}</span>
        <span className="salary-kpi-tile-label">{label}</span>
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
  const [kpi, setKpi] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/salary-kpi-summary/`).then((r) => r.json()).then(setKpi).catch(console.error)
  }, [])

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

  return (
    <div className="salary-slide">
      <div className="salary-bento">
        <div className="salary-satellite-tiles">
          <KpiTile
            label="Median Senior salary"
            icon="💼"
            value={medianSeSalary}
            prefix="$"
            sparklineData={seSparkline}
          />
          <KpiTile
            label="Fully remote roles"
            icon="🌍"
            value={latestRemotePct}
            suffix="%"
            sparklineData={remoteSparkline}
          />
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
      </div>
    </div>
  )
}

export default SalaryTrendsSlide