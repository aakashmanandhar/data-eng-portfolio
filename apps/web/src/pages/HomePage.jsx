import '../App.css'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const explorerData = {
  Germany: { tools: [["Python",88],["dbt",72],["Airflow",64],["Snowflake",41],["Databricks",55]], salary: {Entry:52000, Mid:72000, Senior:95000} },
  USA:     { tools: [["Python",91],["dbt",68],["Airflow",70],["Snowflake",58],["Databricks",62]], salary: {Entry:78000, Mid:110000, Senior:155000} },
  India:   { tools: [["Python",85],["SQL",80],["Airflow",55],["Databricks",48],["dbt",39]], salary: {Entry:12000, Mid:22000, Senior:38000} },
  UK:      { tools: [["Python",83],["dbt",60],["Airflow",58],["Snowflake",50],["Databricks",44]], salary: {Entry:45000, Mid:65000, Senior:88000} },
  Netherlands: { tools: [["Python",80],["dbt",65],["Airflow",52],["Databricks",47],["Snowflake",36]], salary: {Entry:48000, Mid:68000, Senior:90000} }
}

function HomePage() {
  const [status, setStatus] = useState('active')
  const [country, setCountry] = useState('Australia')
  const [caseStudies, setCaseStudies] = useState([])
  const [lastRefreshed, setLastRefreshed] = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/api/case-studies/')
      .then((res) => res.json())
      .then((data) => setCaseStudies(data))
      .catch((err) => console.error('Failed to load case studies:', err))
  }, [])

  useEffect(() => {
    fetch('http://localhost:8000/api/last-refreshed/')
      .then((res) => res.json())
      .then((data) => setLastRefreshed(data.last_refreshed))
      .catch((err) => console.error('Failed to load last refreshed time:', err))
  }, [])

  const [jobMarketData, setJobMarketData] = useState({})
  const [toolUsageData, setToolUsageData] = useState({})
  const [jobCountsByCountry, setJobCountsByCountry] = useState({})
  const [preferredGlobal, setPreferredGlobal] = useState([])
  const [toolRespondentCounts, setToolRespondentCounts] = useState({})

  useEffect(() => {
    fetch('http://localhost:8000/api/job-market/')
      .then((res) => res.json())
      .then((rows) => {
        const grouped = {}
        const totals = {}
        rows.forEach((row) => {
          if (!grouped[row.country_name]) grouped[row.country_name] = {}
          grouped[row.country_name][row.seniority_level] = row.adzuna_salary_usd
          totals[row.country_name] = (totals[row.country_name] || 0) + (row.job_count || 0)
        })
        setJobMarketData(grouped)
        setJobCountsByCountry(totals)
      })
      .catch((err) => console.error('Failed to load job market data:', err))

    fetch('http://localhost:8000/api/tool-usage/')
      .then((res) => res.json())
      .then((rows) => {
        const grouped = {}
        const respondentCounts = {}
        rows.forEach((row) => {
          if (!grouped[row.country]) grouped[row.country] = []
          if (grouped[row.country].length < 5) {
            grouped[row.country].push([row.tool_name, row.usage_count])
          }
          respondentCounts[row.country] = row.respondent_count
        })
        setToolUsageData(grouped)
        setToolRespondentCounts(respondentCounts)
      })
      .catch((err) => console.error('Failed to load tool usage data:', err))
  }, [])

  useEffect(() => {
    fetch('http://localhost:8000/api/tool-preference-global/')
      .then((res) => res.json())
      .then((rows) => setPreferredGlobal(rows.slice(0, 10)))
      .catch((err) => console.error('Failed to load global tool preferences:', err))
  }, [])

  return (
    <>
      <nav className="nav">
        <strong>Aakash Manandhar</strong>
        <div className="nav-links">
          <span>Projects</span>
          <span>Explorer</span>
          <span>ADRs</span>
          <span>About</span>
          <span>Contact</span>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-left">
          <div className="badge">◆ Data Engineer · AI Data Engineer (WIP)</div>
          <h1>
            Turning messy data<br />
            into <span className="grad">reliable pipelines.</span>
          </h1>
          <p className="hero-sub">
            I build production-grade ETL/ELT pipelines, and I run a live end-to-end
            pipeline that tracks data engineering tools and salaries worldwide.
          </p>
          <div className="hero-btns">
            <button className="btn-primary">Explore the Data →</button>
            <button className="btn-secondary">Contact Me</button>
          </div>
        </div>

        <div className="hero-right">
          <div className="profile-card">
            <div className="avatar-wrap">
              <div className="avatar-circle">AM</div>
              <div className={"status-dot status-" + status}></div>
            </div>
            <div className="profile-name">Aakash Manandhar</div>
            <div className="profile-role">Data Engineer</div>
            <div className={"status-label status-text-" + status}>
              <span className="txt-dot"></span>
              {status === 'active' ? 'Active' : status === 'offline' ? 'Offline' : 'Do Not Disturb'}
            </div>
            <div className="status-selector">
              <button onClick={() => setStatus('active')} className={status === 'active' ? 'selected' : ''}>Active</button>
              <button onClick={() => setStatus('offline')} className={status === 'offline' ? 'selected' : ''}>Offline</button>
              <button onClick={() => setStatus('dnd')} className={status === 'dnd' ? 'selected' : ''}>Do Not Disturb</button>
            </div>
            <div className="mini-skills">
              <img src="https://cdn.simpleicons.org/python/3776AB" alt="Python" title="Python" />
              <img src="/icons/sql.svg" alt="PostgreSQL" title="PostgreSQL" />
              <img src="/icons/azure.svg" alt="Azure" title="Microsoft Azure" />
              <img src="/icons/fabric.svg" alt="Fabric" title="Microsoft Fabric" />
              <img src="/icons/dbt.png" alt="dbt" title="dbt" />
              <img src="https://cdn.simpleicons.org/databricks/FF3621" alt="Databricks" title="Databricks" />
              <img src="https://cdn.simpleicons.org/googlecloud/4285F4" alt="GCP" title="GCP" />
              <img src="https://cdn.simpleicons.org/terraform/844FBA" alt="Terraform" title="Terraform" />
              <img src="https://cdn.simpleicons.org/docker/2496ED" alt="Docker" title="Docker" />
              <img src="/icons/airflow.png" alt="Airflow" title="Apache Airflow" />
              <img src="https://cdn.simpleicons.org/snowflake/29B5E8" alt="Snowflake" title="Snowflake" />
              <img src="https://cdn.simpleicons.org/apachespark/E25A1C" alt="PySpark" title="PySpark (Apache Spark)" />
            </div>
          </div>
        </div>
      </div>

      <section className="explorer-section">
        <div className="eyebrow">Featured · Live Explorer</div>
        <div className="explorer-box">
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {Object.keys(jobMarketData).sort().map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="explorer-grid">
            <div className="explorer-panel">
              <h4>TOP TOOLS BY USAGE</h4>
                {toolRespondentCounts[country] && (
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '-8px', marginBottom: '12px' }}>
                    Based on {toolRespondentCounts[country]} data professionals (engineers, analysts, scientists, DBAs) surveyed in this country
                  </p>
                )}
              {toolUsageData[country] && toolUsageData[country].length > 0 ? (
                toolUsageData[country].map(([name, pct]) => (
                  <div className="tool-row" key={name}>
                    <span className="tool-name">{name}</span>
                    <div className="tool-bar-bg">
                      <div className="tool-bar-fill" style={{ width: pct + '%' }}></div>
                    </div>
                    <span className="tool-pct">{pct}/{toolRespondentCounts[country]}</span>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Not enough survey responses yet for this country's tool data.</p>
              )}
            </div>

            <div className="explorer-panel">
            <h4>AVG. SALARY BY SENIORITY (USD/yr)</h4>
            <div className="salary-cards">
              {(() => {
                const entries = Object.entries(jobMarketData[country] || {}).filter(([, val]) => val !== null)
                return entries.map(([level, val], i) => {
                  const prevVal = i > 0 ? entries[i - 1][1] : null
                  const growth = prevVal ? Math.round(((val - prevVal) / prevVal) * 100) : null
                  return (
                    <div className="salary-card" key={level}>
                      <div className="salary-card-label">{level}</div>
                      <div className="salary-card-value">${(val / 1000).toFixed(0)}k</div>
                      <div className={"salary-card-growth" + (growth === null ? " empty" : "")}>
                        {growth !== null ? `+${growth}%` : ''}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
          </div>

          <div className="explorer-note">
            🔧 Live data from PostgreSQL marts built via dbt.
            {lastRefreshed && ` Last refreshed: ${new Date(lastRefreshed).toLocaleString()}`}
          </div>
        </div>
      </section>
     <section className="dual-charts-section">
        <div className="dual-col">
          <div className="eyebrow">Job Postings by Country</div>
          <div className="explorer-box">
  <div className="postings-chip-scroll">
    <div className="preferred-grid">
      {Object.entries(jobCountsByCountry)
        .sort((a, b) => b[1] - a[1])
        .map(([country, count], i) => (
          <div className="preferred-chip" key={country}>
            <span className="preferred-rank">#{i + 1}</span>
            <span className="preferred-name">{country}</span>
            <span className="preferred-count">{count.toLocaleString()}</span>
          </div>
        ))}
    </div>
  </div>
  </div>
  <div className="explorer-note">
          </div>
        </div>
        <div className="dual-col">
          <div className="eyebrow">Most Desired Tools Globally</div>
          <div className="explorer-box">
            <div className="preferred-grid">
              {preferredGlobal.map(({ tool_name, preference_count }, i) => (
                <div className="preferred-chip" key={tool_name}>
                  <span className="preferred-rank">#{i + 1}</span>
                  <span className="preferred-name">{tool_name}</span>
                  <span className="preferred-count">{preference_count}</span>
                </div>
              ))}
            </div>
            <div className="explorer-note">
            🔧 Live data from PostgreSQL marts built via dbt.
            {lastRefreshed && ` Last refreshed: ${new Date(lastRefreshed).toLocaleString()}`}
          </div>
          </div>
        </div>
      </section>
      <section className="case-studies-section">
        <div className="eyebrow">Case Studies</div>
        <div className="card-row">
              {caseStudies.map((cs) => (
              <div className={cs.is_featured ? "case-card featured" : "case-card"} key={cs.id}>
                <div>
                  <h3>{cs.title}</h3>
                  <p>{cs.summary}</p>
                  <div className="pills">
                    {cs.tech_stack.split(',').map((tech) => (
                      <span className="pill" key={tech}>{tech.trim()}</span>
                    ))}
                  </div>
                </div>
                <Link to={`/case-studies/${cs.slug}`} className="case-link">Read case study →</Link>
              </div>
            ))}
        </div>
      </section>
      <section className="adr-section">
        <div className="eyebrow">Architecture Decisions</div>
        <div className="adr-item">
          <h4><span className="adr-tag">ADR-01</span>Self-hosted Postgres + Jenkins over managed warehouses</h4>
          <p>Chose a self-hosted Docker stack over Snowflake/Databricks free tiers to keep the live demo genuinely cost-free and always-on, rather than time-boxed.</p>
        </div>
        <div className="adr-item">
          <h4><span className="adr-tag">ADR-02</span>Databricks + dbt vs. GCP-native</h4>
          <p>Chose Databricks + dbt over a fully GCP-native approach, citing SAP's Databricks partnership and long-term flexibility.</p>
        </div>
      </section>
      <section className="about-section">
        <div className="eyebrow">About</div>
        <div className="about-row">
          <p>Data engineer based in Germany, working across Azure/Fabric and GCP, currently building a live tools-and-salary explorer to practice the full modern ELT stack end to end.</p>
          <button className="resume-btn">⬇ Download Resume</button>
        </div>
      </section>
      <section className="contact-section">
        <div className="eyebrow">Contact</div>
        <div className="contact-form">
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
          <textarea rows="4" placeholder="Message"></textarea>
          <button>Send Message</button>
        </div>
      </section>

      <footer>
        github.com/aakashmanandhar &nbsp;·&nbsp; LinkedIn &nbsp;·&nbsp; Contact
      </footer>
    </>
  )
}

export default HomePage