import '../App.css'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Carousel from '../components/Carousel'
import GitHubTrendsSlide from '../components/GitHubTrendsSlide'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function HomePage() {
  const [status, setStatus] = useState('active')
  const [nowBuilding, setNowBuilding] = useState('')
  const [country, setCountry] = useState('Australia')
  const [caseStudies, setCaseStudies] = useState([])
  const [adrs, setAdrs] = useState([])
  const [jobMarketData, setJobMarketData] = useState({})
  const [jobCountsByCountry, setJobCountsByCountry] = useState({})
  const [toolUsageData, setToolUsageData] = useState({})
  const [toolRespondentCounts, setToolRespondentCounts] = useState({})
  const [preferredGlobal, setPreferredGlobal] = useState([])
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactStatus, setContactStatus] = useState(null)
  const [resumeUrl, setResumeUrl] = useState(null)
  const [aboutText, setAboutText] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [headlineMain, setHeadlineMain] = useState('Architecting the data infrastructure behind reliable pipelines.')
  const [subtext, setSubtext] = useState('I build production-grade ETL/ELT pipelines, and I run a live end-to-end pipeline.')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [pipelineRuns, setPipelineRuns] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/api/pipeline-runs/`)
      .then((res) => res.json())
      .then((data) => setPipelineRuns(data))
      .catch((err) => console.error('Failed to load pipeline runs:', err))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light')

  useEffect(() => {
    fetch(`${API_BASE}/api/case-studies/`)
      .then((res) => res.json())
      .then((data) => setCaseStudies(data))
      .catch((err) => console.error('Failed to load case studies:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/adrs/`)
      .then((res) => res.json())
      .then((data) => setAdrs(data))
      .catch((err) => console.error('Failed to load ADRs:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/job-market/`)
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

    fetch(`${API_BASE}/api/tool-usage/`)
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
    fetch(`${API_BASE}/api/tool-preference-global/`)
      .then((res) => res.json())
      .then((rows) => setPreferredGlobal(rows.slice(0, 10)))
      .catch((err) => console.error('Failed to load global tool preferences:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/last-refreshed/`)
      .then((res) => res.json())
      .then((data) => setLastRefreshed(data.last_refreshed))
      .catch((err) => console.error('Failed to load last refreshed time:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/profile-status/`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.status)
        setNowBuilding(data.now_building)
        setResumeUrl(data.resume_pdf)
        setAboutText(data.about_text)
        setProfilePhoto(data.profile_photo)
        if (data.headline_main) setHeadlineMain(data.headline_main)
        if (data.subtext) setSubtext(data.subtext)
      })
      .catch((err) => console.error('Failed to load profile status:', err))
  }, [])

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      if (res.ok) {
        setContactStatus('success')
        setContactForm({ name: '', email: '', message: '' })
      } else {
        setContactStatus('error')
      }
    } catch (err) {
      setContactStatus('error')
    }
  }

  return (
    <>
      <nav className="nav">
        <strong>Aakash Manandhar</strong>
        <div className="nav-links">
          <a href="#projects">Projects</a>
          <a href="#explorer">Explorer</a>
          <Link to="/architecture">Architecture</Link>
          <a href="#adrs">ADRs</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <button className="theme-toggle" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-left">
          <div className="badge">◆ Data Engineer · AI Data Engineer (WIP)</div>
          {(() => {
            const words = headlineMain.trim().split(' ')
            const highlighted = words.slice(-2).join(' ')
            const rest = words.slice(0, -2).join(' ')
            return (
              <h1>
                {rest} <span className="grad">{highlighted}</span>
              </h1>
            )
          })()}
          <p className="hero-sub">{subtext}</p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={() => window.dispatchEvent(new Event('open-chat-widget'))}>Talk to Assistant →</button>
            <a href="#explorer" className="btn-secondary">Explore the Data</a>
          </div>
        </div>

        <div className="hero-right">
          <div className="profile-card">
            <div className="avatar-wrap">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Aakash Manandhar" className="avatar-circle avatar-photo" />
              ) : (
                <div className="avatar-circle">AM</div>
              )}
              <div className={"status-dot status-" + status}></div>
            </div>
            <div className="profile-name">Aakash Manandhar</div>
            <div className="profile-role">Data Engineer</div>
            <div className={"status-label status-text-" + status}>
              <span className="txt-dot"></span>
              {status === 'active' ? 'Active' : status === 'offline' ? 'Offline' : 'Do Not Disturb'}
            </div>
            <div className="mini-skills">
              <img src="/icons/python.svg" alt="Python" title="Python" />
              <img src="/icons/sql.svg" alt="PostgreSQL" title="PostgreSQL" />
              <img src="/icons/azure.svg" alt="Azure" title="Microsoft Azure" />
              <img src="/icons/fabric.svg" alt="Fabric" title="Microsoft Fabric" />
              <img src="/icons/dbt.png" alt="dbt" title="dbt" />
              <img src="https://cdn.simpleicons.org/databricks/FF3621" alt="Databricks" title="Databricks" />
              <img src="/icons/gcp.svg" alt="GCP" title="GCP" />
              <img src="https://cdn.simpleicons.org/terraform/844FBA" alt="Terraform" title="Terraform" />
              <img src="https://cdn.simpleicons.org/docker/2496ED" alt="Docker" title="Docker" />
              <img src="/icons/airflow.svg" alt="Airflow" title="Apache Airflow" />
              <img src="https://cdn.simpleicons.org/snowflake/29B5E8" alt="Snowflake" title="Snowflake" />
              <img src="https://cdn.simpleicons.org/apachespark/E25A1C" alt="PySpark" title="PySpark (Apache Spark)" />
            </div>
          </div>
        </div>
      </div>

      <div className="now-card">
        <span className="now-dot"></span>
        <span><span className="label">Now building</span>{nowBuilding}</span>
      </div>
      

         <div className="analytics-header">
        <div className="analytics-header-text">
          <h2>Live Data Engineering Analytics</h2>
          <p>Real salary, hiring, and tooling data — refreshed automatically by a live ELT pipeline.</p>
        </div>
        <div className={`pipeline-status-widget ${pipelineRuns.length > 0 ? `status-${pipelineRuns[0].status}` : 'status-unknown'}`}>
          <span className="pipeline-status-icon">
            {pipelineRuns.length === 0 ? '⏳' : pipelineRuns[0].status === 'success' ? '✅' : '❌'}
          </span>
          <div className="pipeline-status-text">
            <span className="pipeline-status-title">
              {pipelineRuns.length === 0 ? 'No runs yet' : pipelineRuns[0].status === 'success' ? 'Pipeline Healthy' : 'Pipeline Failed'}
            </span>
            {pipelineRuns.length > 0 && (
              <span className="pipeline-status-time">
                {new Date(pipelineRuns[0].finished_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <Carousel
        slides={[
          
          <GitHubTrendsSlide key="github-trends" />,
          <div className="job-market-slide">

            <section className="explorer-section" id="explorer">
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
                      toolUsageData[country].map(([name, pct]) => {
                        const widthPct = Math.min(100, Math.round((pct / toolRespondentCounts[country]) * 100))
                        return (
                          <div className="tool-row" key={name}>
                            <span className="tool-name">{name}</span>
                            <div className="tool-bar-bg">
                              <div className="tool-bar-fill" style={{ width: widthPct + '%' }}></div>
                            </div>
                            <span className="tool-pct">{pct}/{toolRespondentCounts[country]}</span>
                          </div>
                        )
                      })
                    ) : (
                      <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Not enough survey responses yet for this country's tool data.</p>
                    )}
                  </div>
                  <div className="explorer-panel">
                    <h4>AVG. SALARY BY SENIORITY (USD/yr)</h4>
                    <div className="salary-cards">
                      {(() => {
                        const entries = Object.entries(jobMarketData[country] || {}).filter(([, val]) => val !== null)
                        if (entries.length === 0) {
                          return (
                            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                              No salary data yet for this country — showing job posting volume only.
                            </p>
                          )
                        }
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
                <div className="eyebrow">Data Engineering Jobs Posting by Country</div>
                <div className="explorer-box">
                  <div className="chip-scroll-area">
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
                  <div className="explorer-note">
                    🔧 Live data from PostgreSQL marts built via dbt.
                    {lastRefreshed && ` Last refreshed: ${new Date(lastRefreshed).toLocaleString()}`}
                  </div>
                </div>
              </div>
              <div className="dual-col">
                <div className="eyebrow">Most Desired Data Engineering Tools Globally</div>
                <div className="explorer-box">
                  <div className="chip-scroll-area">
                    <div className="preferred-grid">
                      {preferredGlobal.map(({ tool_name, preference_count }, i) => (
                        <div className="preferred-chip" key={tool_name}>
                          <span className="preferred-rank">#{i + 1}</span>
                          <span className="preferred-name">{tool_name}</span>
                          <span className="preferred-count">{preference_count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="explorer-note">
                    🔧 Live data from PostgreSQL marts built via dbt.
                    {lastRefreshed && ` Last refreshed: ${new Date(lastRefreshed).toLocaleString()}`}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ]}
      />

      <section className="case-studies-section" id="projects">
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

      <section className="adr-section" id="adrs">
        <div className="eyebrow">Architecture Decisions</div>
        {adrs.map((adr) => (
          <div className="adr-item" key={adr.id}>
            <h4><span className="adr-tag">ADR-{String(adr.id).padStart(2, '0')}</span>{adr.title}</h4>
            <p>{adr.decision}</p>
          </div>
        ))}
      </section>

      <section className="about-section" id="about">
        <div className="eyebrow">About</div>
        <div className="about-row">
          <p>{aboutText}</p>
          {resumeUrl ? (
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="resume-btn">⬇ Download Resume</a>
          ) : (
            <button className="resume-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>⬇ Resume Coming Soon</button>
          )}
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="eyebrow">Contact</div>
        <form className="contact-form" onSubmit={handleContactSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            required
          />
          <textarea
            rows="4"
            placeholder="Message"
            value={contactForm.message}
            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
            required
          ></textarea>
          <button type="submit">Send Message</button>
          {contactStatus === 'success' && (
            <div className="form-status success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Message sent — thank you! I'll get back to you soon.</span>
            </div>
          )}
          {contactStatus === 'error' && (
            <div className="form-status error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Something went wrong — please try again.</span>
            </div>
          )}
        </form>
      </section>

      <footer>
        <a href="https://github.com/aakashmanandhar" target="_blank" rel="noopener noreferrer">github.com/aakashmanandhar</a>
        &nbsp;·&nbsp;
        <a href="https://www.linkedin.com/in/aakashmanandhar/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        &nbsp;·&nbsp;
        <a href="#contact">Contact</a>
      </footer>
    </>
  )
}

export default HomePage
