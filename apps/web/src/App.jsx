import './App.css'
import { useState } from 'react'

function App() {
  const [status, setStatus] = useState('active')

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
    </>
  )
}

export default App