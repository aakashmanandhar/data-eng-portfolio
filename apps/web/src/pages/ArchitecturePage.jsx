import { Link } from 'react-router-dom'
import '../App.css'

const stack = [
  'Django', 'Django REST Framework', 'React', 'PostgreSQL', 'pgvector',
  'dbt', 'Terraform', 'Docker', 'Jenkins', 'Apache Airflow', 'Nginx', 'Cloudflare',
  'Google Gemini API', 'Adzuna API', 'GitHub API', 'Stack Overflow Developer Survey',
  'scikit-learn', 'react-leaflet', 'Recharts', 'OSS Insight API', 'Practical Data Community Survey'
]

function ArchitecturePage() {
  return (
    <div className="detail-page">
      <Link to="/" className="back-link">← Back to portfolio</Link>
      <h1>How This Site Works</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14.5px', lineHeight: 1.7, marginBottom: '30px' }}>
        This portfolio isn't just a static page describing my work — it's a live,
        self-hosted data platform running three independently-orchestrated pipelines
        and five real ML models. Here's the architecture behind all of it, end to end.
      </p>

      <h2 style={{ fontSize: '17px', marginBottom: '14px' }}>Pipeline 1 · Job Market Data (Jenkins)</h2>
      <svg viewBox="0 0 900 495" style={{ width: '100%', height: 'auto', marginBottom: '30px' }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
          </marker>
        </defs>

        <rect x="20" y="20" width="160" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="100" y="40" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Adzuna API</text>
        <text x="100" y="56" textAnchor="middle" fontSize="10" fill="var(--muted)">salaries, job counts</text>

        <rect x="20" y="90" width="160" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="100" y="110" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">SO Developer Survey</text>
        <text x="100" y="126" textAnchor="middle" fontSize="10" fill="var(--muted)">tools, self-reported salary</text>

        <rect x="240" y="55" width="150" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--accent1)" strokeWidth="1.5" />
        <text x="315" y="75" textAnchor="middle" fontSize="12" fill="var(--accent1)" fontWeight="700">Jenkins</text>
        <text x="315" y="91" textAnchor="middle" fontSize="10" fill="var(--muted)">every 6 hours</text>

        <line x1="180" y1="45" x2="240" y2="75" stroke="var(--muted)" markerEnd="url(#arrow)" />
        <line x1="180" y1="115" x2="240" y2="85" stroke="var(--muted)" markerEnd="url(#arrow)" />

        <rect x="440" y="20" width="180" height="140" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="530" y="40" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="700">PostgreSQL</text>
        <rect x="455" y="52" width="150" height="26" rx="5" fill="var(--bg)" stroke="var(--border)" />
        <text x="530" y="69" textAnchor="middle" fontSize="10" fill="var(--muted)">bronze — raw JSON</text>
        <rect x="455" y="84" width="150" height="26" rx="5" fill="var(--bg)" stroke="var(--border)" />
        <text x="530" y="101" textAnchor="middle" fontSize="10" fill="var(--muted)">silver — cleaned</text>
        <rect x="455" y="116" width="150" height="26" rx="5" fill="var(--bg)" stroke="var(--accent1)" />
        <text x="530" y="133" textAnchor="middle" fontSize="10" fill="var(--accent1)" fontWeight="600">gold — star schema (dbt)</text>

        <line x1="390" y1="80" x2="440" y2="80" stroke="var(--muted)" markerEnd="url(#arrow)" />

        <rect x="440" y="190" width="180" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="530" y="210" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">pgvector</text>
        <text x="530" y="226" textAnchor="middle" fontSize="10" fill="var(--muted)">case study embeddings</text>
        <line x1="530" y1="160" x2="530" y2="190" stroke="var(--muted)" markerEnd="url(#arrow)" />

        <rect x="680" y="70" width="160" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="760" y="90" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Django + DRF</text>
        <text x="760" y="106" textAnchor="middle" fontSize="10" fill="var(--muted)">REST API</text>
        <line x1="620" y1="90" x2="680" y2="95" stroke="var(--muted)" markerEnd="url(#arrow)" />

        <rect x="680" y="150" width="160" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="760" y="170" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Gemini API</text>
        <text x="760" y="186" textAnchor="middle" fontSize="10" fill="var(--muted)">router · text-to-SQL · RAG</text>
        <line x1="620" y1="215" x2="680" y2="180" stroke="var(--muted)" markerEnd="url(#arrow)" />
        <line x1="760" y1="150" x2="760" y2="120" stroke="var(--muted)" markerEnd="url(#arrow)" />

        <rect x="440" y="270" width="180" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" strokeDasharray="4 3" />
        <text x="530" y="290" textAnchor="middle" fontSize="12" fill="var(--muted)" fontWeight="600">No dedicated dashboard</text>
        <text x="530" y="306" textAnchor="middle" fontSize="9.5" fill="var(--muted)">retired — RAG-only now</text>

        <rect x="20" y="380" width="140" height="46" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="90" y="408" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Cloudflare</text>

        <rect x="190" y="380" width="140" height="46" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="260" y="408" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Nginx</text>

        <rect x="360" y="380" width="180" height="46" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="450" y="408" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Docker containers</text>

        <rect x="570" y="380" width="180" height="46" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="660" y="408" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Terraform</text>

        <line x1="160" y1="403" x2="190" y2="403" stroke="var(--muted)" markerEnd="url(#arrow)" />
        <line x1="330" y1="403" x2="360" y2="403" stroke="var(--muted)" markerEnd="url(#arrow)" />
        <line x1="540" y1="403" x2="570" y2="403" stroke="var(--muted)" markerEnd="url(#arrow)" />

        <text x="450" y="460" textAnchor="middle" fontSize="10.5" fill="var(--muted)">
          Self-hosted on a single VPS. The dedicated dashboard for this pipeline was retired — its data
        </text>
        <text x="450" y="475" textAnchor="middle" fontSize="10.5" fill="var(--muted)">
          is still live and queryable, just through the RAG assistant now rather than a standalone UI.
        </text>
      </svg>

      <h2 style={{ fontSize: '17px', marginBottom: '14px' }}>Pipeline 2 · GitHub Trends (Apache Airflow)</h2>
      <svg viewBox="0 0 900 380" style={{ width: '100%', height: 'auto', marginBottom: '30px' }}>
        <defs>
          <marker id="arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
          </marker>
        </defs>

        <rect x="20" y="20" width="170" height="42" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="105" y="38" textAnchor="middle" fontSize="11.5" fill="var(--text)" fontWeight="600">Fixed Tool List</text>
        <text x="105" y="53" textAnchor="middle" fontSize="9.5" fill="var(--muted)">57 tracked repos</text>

        <rect x="20" y="72" width="170" height="42" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="105" y="90" textAnchor="middle" fontSize="11.5" fill="var(--text)" fontWeight="600">Topic Discovery</text>
        <text x="105" y="105" textAnchor="middle" fontSize="9.5" fill="var(--muted)">GitHub Search API</text>

        <rect x="20" y="124" width="170" height="42" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="105" y="142" textAnchor="middle" fontSize="11.5" fill="var(--text)" fontWeight="600">Org Activity</text>
        <text x="105" y="157" textAnchor="middle" fontSize="9.5" fill="var(--muted)">Apache, dbt Labs, etc.</text>

        <rect x="250" y="60" width="150" height="55" rx="8" fill="var(--bg-alt)" stroke="var(--accent2)" strokeWidth="1.5" />
        <text x="325" y="82" textAnchor="middle" fontSize="12" fill="var(--accent2)" fontWeight="700">Apache Airflow</text>
        <text x="325" y="98" textAnchor="middle" fontSize="9.5" fill="var(--muted)">daily · parallel fan-out/in</text>

        <line x1="190" y1="41" x2="250" y2="75" stroke="var(--muted)" markerEnd="url(#arrow2)" />
        <line x1="190" y1="93" x2="250" y2="90" stroke="var(--muted)" markerEnd="url(#arrow2)" />
        <line x1="190" y1="145" x2="250" y2="100" stroke="var(--muted)" markerEnd="url(#arrow2)" />

        <rect x="450" y="30" width="190" height="110" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="545" y="50" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="700">PostgreSQL</text>
        <rect x="463" y="62" width="164" height="26" rx="5" fill="var(--bg)" stroke="var(--border)" />
        <text x="545" y="79" textAnchor="middle" fontSize="9.5" fill="var(--muted)">bronze — daily snapshots (append-only)</text>
        <rect x="463" y="94" width="164" height="26" rx="5" fill="var(--bg)" stroke="var(--accent2)" />
        <text x="545" y="111" textAnchor="middle" fontSize="9.5" fill="var(--accent2)" fontWeight="600">gold — LAG() growth calc (dbt)</text>

        <line x1="400" y1="87" x2="450" y2="85" stroke="var(--muted)" markerEnd="url(#arrow2)" />

        <rect x="690" y="35" width="160" height="46" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="770" y="53" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Django + DRF</text>
        <text x="770" y="68" textAnchor="middle" fontSize="9.5" fill="var(--muted)">now 15+ endpoints</text>

        <rect x="690" y="95" width="160" height="46" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="770" y="113" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">React Dashboard</text>
        <text x="770" y="128" textAnchor="middle" fontSize="9.5" fill="var(--muted)">6 carousel slides</text>

        <line x1="640" y1="70" x2="690" y2="58" stroke="var(--muted)" markerEnd="url(#arrow2)" />
        <line x1="770" y1="81" x2="770" y2="95" stroke="var(--muted)" markerEnd="url(#arrow2)" />

        <text x="450" y="200" textAnchor="middle" fontSize="10.5" fill="var(--muted)">
          Two orchestrators, one Postgres instance — Airflow proves multi-tool orchestration fluency alongside Jenkins.
        </text>
      </svg>

      <h2 style={{ fontSize: '17px', marginBottom: '14px' }}>Pipeline 3 · Historical Survey Analytics (manual trigger)</h2>
      <p style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: 1.7, marginBottom: '18px' }}>
        Two static survey sources, deliberately NOT on a live schedule since neither has a public API — a human downloads
        a new year's data, then this DAG handles everything after that.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '30px' }}>
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent1)', marginBottom: '6px' }}>Stack Overflow Developer Survey</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
            2016–2025 (10 years, 720,140 respondents). 3 harmonized column-naming eras, a country-name crosswalk (18 exceptions),
            and a DE/AI-DE tool whitelist enforced structurally via an INNER JOIN — theme filtering is a database constraint,
            not a UI afterthought. Feeds a real per-country and overall tool-adoption forecast (scikit-learn LinearRegression,
            gated behind 4+ years of history).
          </div>
        </div>
        <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent2)', marginBottom: '6px' }}>Practical Data Community Survey</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
            A single 2026 snapshot (1,101 respondents) — no time axis, so no forecasting here, only k-means clustering into
            4 real organizational archetypes based on architecture/orchestration/AI-adoption choices. Named from actual
            cluster centroids, not assumed labels — and the finding is stated honestly: teams split by tooling philosophy,
            not by a clean "maturity" ladder.
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '17px', marginBottom: '14px' }}>ML & Analytics Layer — five real models</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '30px' }}>
        {[
          ['AI Adoption Forecast', 'GitHub + arXiv + Hacker News → LinearRegression, retrained daily, honest insufficient_data gate below 7 days'],
          ['GIS Country Archetypes', 'k-means clustering countries by AI-share % and GitHub activity — a snapshot technique, no history required'],
          ['DE Tool Forecast', 'Per-country and overall tool-usage regression on 10 years of real Stack Overflow data'],
          ['Org Maturity Clustering', 'k-means on 2026 survey respondents — 4 real archetypes by tooling philosophy'],
          ['Tool Co-Adoption Clustering', 'k-means grouping GitHub repos by country-adoption pattern, not topic — refreshed daily'],
        ].map(([title, desc]) => (
          <div key={title} style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{title}</div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '18px', marginTop: '30px', marginBottom: '10px' }}>Why these choices</h2>
      <div style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.8 }}>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>ELT over ETL:</strong> raw data lands untouched in Postgres first (bronze),
          and all transformation logic lives in version-controlled dbt models — so the source of truth is always inspectable,
          and transformations can be rebuilt without re-fetching from source APIs.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Medallion architecture:</strong> bronze/silver/gold schemas separate raw ingestion,
          cleaning, and business-ready star-schema modeling — each layer testable independently via dbt tests.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Two orchestrators, deliberately:</strong> the job-market pipeline runs on Jenkins
          (every 6 hours), while GitHub Trends and the newer tool co-adoption clustering run on Apache Airflow (daily, with a genuine
          parallel fan-out/fan-in DAG). Different tools for different needs — Jenkins for simple linear cron jobs, Airflow where
          real dependency graphs and time-series scheduling matter.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Time-series over snapshots:</strong> unlike the job-market pipeline's
          truncate-and-reload bronze tables, GitHub Trends never deletes old data — every daily run appends a fresh snapshot,
          and dbt's window functions (LAG) compute real day-over-day star growth once enough history accumulates.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Self-hosted, not managed:</strong> every piece — Postgres, Jenkins, Airflow,
          Django, React — runs in Docker on a single VPS I administer directly, giving full control over cost and configuration
          at the expense of the convenience managed services provide.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>RAG grounded in real data:</strong> the chat assistant routes questions
          to either live SQL over all three pipelines' gold schemas or vector retrieval over embedded case study content — it's
          built to say "I don't know" rather than hallucinate when source material doesn't cover something.
        </p>
        <p style={{ marginBottom: '14px' }}>
          <strong style={{ color: 'var(--text)' }}>Honest data-sufficiency gates, everywhere:</strong> every forecast model
          in this system — GitHub trends, tool adoption, per-country signals — reports "insufficient_data" below a real
          threshold rather than fabricating a confident trend from too few points. The same discipline applies to
          Growth Forecast and Career Fit on the GIS map, both currently gated honestly while more daily history accumulates.
        </p>
        <p>
          <strong style={{ color: 'var(--text)' }}>Cluster IDs are not stable — name by content, not position:</strong> a real
          bug found via testing against the server's independently-accumulated data: k-means assigns numeric cluster IDs
          arbitrarily, so the same semantic group can get a different ID from one run to the next. Every clustering model
          here names clusters by inspecting real anchor members or centroid characteristics, never by a fixed ID mapping.
        </p>
      </div>

      <h2 style={{ fontSize: '18px', marginTop: '30px', marginBottom: '14px' }}>Full stack</h2>
      <div className="pills">
        {stack.map((tech) => (
          <span className="pill" key={tech}>{tech}</span>
        ))}
      </div>
    </div>
  )
}

export default ArchitecturePage