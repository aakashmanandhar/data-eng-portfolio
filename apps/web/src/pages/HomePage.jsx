import '../App.css'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Carousel from '../components/Carousel'
import SalaryTrendsSlide from '../components/SalaryTrendsSlide'
import GitHubTrendsSlide from '../components/GitHubTrendsSlide'
import GisAiMapSlide from '../components/GisAiMapSlide'
import SoSurveySlide from '../components/SoSurveySlide'
import OrgArchetypeSlide from '../components/OrgArchetypeSlide'
import OssLandscapeSlide from '../components/OssLandscapeSlide'
import NewsIntelligenceSlide from '../components/NewsIntelligenceSlide'
import AIAgentPipelineSlide from '../components/AIAgentPipelineSlide'

function relativeTime(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

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
  const [activeSlide, setActiveSlide] = useState(0)
  const [githubPipelineRuns, setGithubPipelineRuns] = useState([])
  const [salaryPipelineRuns, setSalaryPipelineRuns] = useState([])
  const [aiAgentPipelineRuns, setAiAgentPipelineRuns] = useState([])
  useEffect(() => {
    fetch(`${API_BASE}/api/pipeline-runs/?pipeline=github_trends`)
      .then((res) => res.json())
      .then(setGithubPipelineRuns)
      .catch((err) => console.error('Failed to load pipeline runs:', err))
  }, [])
  useEffect(() => {
    fetch(`${API_BASE}/api/pipeline-runs/?pipeline=salary_pipeline`)
      .then((res) => res.json())
      .then(setSalaryPipelineRuns)
      .catch((err) => console.error('Failed to load salary pipeline runs:', err))
  }, [])
  useEffect(() => {
    fetch(`${API_BASE}/api/pipeline-runs/?pipeline=ai_dataeng_trends`)
      .then((res) => res.json())
      .then(setAiAgentPipelineRuns)
      .catch((err) => console.error('Failed to load AI agent pipeline runs:', err))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/pipeline-runs/?pipeline=job_market`)
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
          <a href="#explorer" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('carousel-jump', { detail: { index: 2 } })) }}>Explorer</a>
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
            <button className="btn-primary" onClick={() => window.dispatchEvent(new Event('open-chat-widget'))}>Talk to Assistant</button>
            <a href="#explorer" className="btn-secondary" onClick={(e)=> { e.preventDefault(); window.dispatchEvent(new CustomEvent('carousel-jump', { detail: { index: 2 } })) }}>Explore Data</a>
            <a href="#explorer" className="btn-primary" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('carousel-jump', { detail: { index: 6 } })) }}>DE & AI News</a>
            <a href="#explorer" className="btn-secondary" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('carousel-jump', { detail: { index: 7 } })) }}>AI & DE Research</a>
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
          <div className="now-card">
            <div className="now-icon-badge">
              <span className="now-icon-pulse"></span>
              🛠️
            </div>
            <div className="now-content">
              <span className="now-label">Now Building</span>
              <span className="now-text">{nowBuilding}</span>
            </div>
          </div>
        </div>
      </div>
      

      <div className="analytics-header">
          <div className="analytics-header-text">
            <h2>Live Data Engineering Analytics</h2>
            <p>Live DE/AI-DE news and sentiment intelligence, real salary and career intelligence from a trained ML model, a decade of tool-adoption history, and organizational and geographic AI trends — refreshed automatically by live ELT and ML pipelines. Seven views into how data engineering careers and tooling are actually evolving.</p>
          </div>
          {(() => {
            const slideConfig = [
              { kind: 'airflow', runs: salaryPipelineRuns, title: 'Salary Pipeline' },
              { kind: 'airflow', runs: githubPipelineRuns, title: 'GitHub Trends Pipeline' },
              { kind: 'airflow', runs: githubPipelineRuns, title: 'AI Adoption Pipeline' },
              { kind: 'static', icon: '📊', title: 'Historical Survey Data', time: '2016–2025, static snapshot' },
              { kind: 'static', icon: '📊', title: 'Community Survey Data', time: '2026, static snapshot' },
              { kind: 'airflow', runs: githubPipelineRuns, title: 'OSS Landscape Pipeline' },
              { kind: 'airflow', runs: githubPipelineRuns, title: 'News Intelligence Pipeline' },
              { kind: 'airflow', runs: aiAgentPipelineRuns, title: 'AI & DE Research Pipeline' },
            ]
            const cfg = slideConfig[activeSlide] || slideConfig[1]
            if (cfg.kind === 'static') {
              return (
                <div className="pipeline-status-widget status-static">
                  <span className="pipeline-status-icon-badge">
                    <span className="pipeline-status-icon">{cfg.icon}</span>
                  </span>
                  <div className="pipeline-status-text">
                    <span className="pipeline-status-title">{cfg.title}</span>
                    <span className="pipeline-status-time">{cfg.time}</span>
                  </div>
                </div>
              )
            }
            const runs = cfg.runs
            const status = runs.length === 0 ? 'unknown' : runs[0].status
            return (
              <div className={`pipeline-status-widget status-${status}`}>
                <span className="pipeline-status-icon-badge">
                  <span className="pipeline-status-icon">
                    {runs.length === 0 ? '⏳' : status === 'success' ? '✓' : '✕'}
                  </span>
                  {status === 'success' && <span className="pipeline-status-live-dot"></span>}
                </span>
                <div className="pipeline-status-text">
                  <span className="pipeline-status-title">
                    {cfg.title} {runs.length === 0 ? '· No runs yet' : status === 'success' ? '· Live' : '· Failed'}
                  </span>
                  {runs.length > 0 && (
                    <span className="pipeline-status-time">
                      Updated {relativeTime(runs[0].finished_at)}
                    </span>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      <Carousel
        onSlideChange={setActiveSlide}
        slides={[
          
          <SalaryTrendsSlide key="salary-trends" />,
          <GitHubTrendsSlide key="github-trends" />,
          <GisAiMapSlide key="gis-ai-map" />,
          <SoSurveySlide key="so-survey" />,
          <OrgArchetypeSlide key="org-archetype" />,
          <OssLandscapeSlide key="oss-landscape" />,
          <NewsIntelligenceSlide key="news-intelligence" />,
          <AIAgentPipelineSlide key="ai-agent-pipeline" />,
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
