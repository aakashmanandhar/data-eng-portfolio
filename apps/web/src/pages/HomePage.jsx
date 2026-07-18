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
  const [country, setCountry] = useState('Germany')
  const [caseStudies, setCaseStudies] = useState([])

  useEffect(() => {
    fetch('http://localhost:8000/api/case-studies/')
      .then((res) => res.json())
      .then((data) => setCaseStudies(data))
      .catch((err) => console.error('Failed to load case studies:', err))
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
            <option value="Germany">🇩🇪 Germany</option>
            <option value="USA">🇺🇸 USA</option>
            <option value="India">🇮🇳 India</option>
            <option value="UK">🇬🇧 UK</option>
            <option value="Netherlands">🇳🇱 Netherlands</option>
          </select>

          <div className="explorer-grid">
            <div className="explorer-panel">
              <h4>TOP TOOLS BY USAGE</h4>
              {explorerData[country].tools.map(([name, pct]) => (
                <div className="tool-row" key={name}>
                  <span className="tool-name">{name}</span>
                  <div className="tool-bar-bg">
                    <div className="tool-bar-fill" style={{ width: pct + '%' }}></div>
                  </div>
                  <span className="tool-pct">{pct}%</span>
                </div>
              ))}
            </div>

            <div className="explorer-panel">
              <h4>AVG. SALARY BY SENIORITY (USD/yr)</h4>
              <div className="sal-row">
                {Object.entries(explorerData[country].salary).map(([level, val]) => {
                  const max = Math.max(...Object.values(explorerData[country].salary))
                  return (
                    <div className="sal-bar-wrap" key={level}>
                      <div className="sal-value">${(val / 1000).toFixed(0)}k</div>
                      <div className="sal-bar" style={{ height: (val / max * 100) + 'px' }}></div>
                      <div className="sal-label">{level}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="explorer-note">🔧 Sample data shown — live version pulls from PostgreSQL marts built via dbt.</div>
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