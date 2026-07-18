import './App.css'
import { useState } from 'react'

const explorerData = {
  Germany: { tools: [["Python",88],["dbt",72],["Airflow",64],["Snowflake",41],["Databricks",55]], salary: {Entry:52000, Mid:72000, Senior:95000} },
  USA:     { tools: [["Python",91],["dbt",68],["Airflow",70],["Snowflake",58],["Databricks",62]], salary: {Entry:78000, Mid:110000, Senior:155000} },
  India:   { tools: [["Python",85],["SQL",80],["Airflow",55],["Databricks",48],["dbt",39]], salary: {Entry:12000, Mid:22000, Senior:38000} },
  UK:      { tools: [["Python",83],["dbt",60],["Airflow",58],["Snowflake",50],["Databricks",44]], salary: {Entry:45000, Mid:65000, Senior:88000} },
  Netherlands: { tools: [["Python",80],["dbt",65],["Airflow",52],["Databricks",47],["Snowflake",36]], salary: {Entry:48000, Mid:68000, Senior:90000} }
}

function App() {
  const [status, setStatus] = useState('active')
  const [country, setCountry] = useState('Germany')

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
          <div className="case-card featured">
            <div>
              <h3>Data Eng. Tools & Salary Explorer</h3>
              <p>End-to-end ELT pipeline collecting job market and tool-usage data by country, modeled in Postgres via dbt, orchestrated with Jenkins, deployed with Terraform.</p>
              <div className="pills">
                <span className="pill">Python</span>
                <span className="pill">PostgreSQL</span>
                <span className="pill">dbt</span>
                <span className="pill">Jenkins</span>
                <span className="pill">Terraform</span>
              </div>
            </div>
            <div className="case-link">Read case study →</div>
          </div>

          <div className="case-card">
            <div>
              <h3>SAP → GCP Medallion Pipeline</h3>
              <p>PostgreSQL → BigQuery via Bronze/Silver/Gold layers, orchestrated with Airflow, modeled with dbt, provisioned with Terraform.</p>
              <div className="pills">
                <span className="pill">dbt</span>
                <span className="pill">Airflow</span>
                <span className="pill">Terraform</span>
                <span className="pill">BigQuery</span>
              </div>
            </div>
            <div className="case-link">Read case study →</div>
          </div>

          <div className="case-card">
            <div>
              <h3>Text-to-SQL + RAG Assistant</h3>
              <p>Natural-language querying over the pipeline's own data and documentation, routed between analytics queries and project docs.</p>
              <div className="pills">
                <span className="pill">Django</span>
                <span className="pill">pgvector</span>
                <span className="pill">LLM API</span>
              </div>
            </div>
            <div className="case-link">Read case study →</div>
          </div>
        </div>
      </section>
    </>
  )
}

export default App