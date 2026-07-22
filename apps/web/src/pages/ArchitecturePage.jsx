import { Link } from 'react-router-dom'
import '../App.css'

const stack = [
  'Django', 'Django REST Framework', 'React', 'PostgreSQL', 'pgvector',
  'dbt', 'Terraform', 'Docker', 'Jenkins', 'Nginx', 'Cloudflare',
  'Google Gemini API', 'Adzuna API', 'Stack Overflow Developer Survey'
]

function ArchitecturePage() {
  return (
    <div className="detail-page">
      <Link to="/" className="back-link">← Back to portfolio</Link>
      <h1>How This Site Works</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14.5px', lineHeight: 1.7, marginBottom: '30px' }}>
        This portfolio isn't just a static page describing my work — it's a live,
        self-hosted data platform. Here's the architecture behind it, end to end.
      </p>

      <svg viewBox="0 0 900 520" style={{ width: '100%', height: 'auto', marginBottom: '30px' }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
          </marker>
        </defs>

        {/* Sources */}
        <rect x="20" y="20" width="160" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="100" y="40" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Adzuna API</text>
        <text x="100" y="56" textAnchor="middle" fontSize="10" fill="var(--muted)">salaries, job counts</text>

        <rect x="20" y="90" width="160" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="100" y="110" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">SO Developer Survey</text>
        <text x="100" y="126" textAnchor="middle" fontSize="10" fill="var(--muted)">tools, self-reported salary</text>

        {/* Jenkins */}
        <rect x="240" y="55" width="150" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--accent1)" strokeWidth="1.5" />
        <text x="315" y="75" textAnchor="middle" fontSize="12" fill="var(--accent1)" fontWeight="700">Jenkins</text>
        <text x="315" y="91" textAnchor="middle" fontSize="10" fill="var(--muted)">every 6 hours</text>

        <line x1="180" y1="45" x2="240" y2="75" stroke="var(--muted)" markerEnd="url(#arrow)" />
        <line x1="180" y1="115" x2="240" y2="85" stroke="var(--muted)" markerEnd="url(#arrow)" />

        {/* Postgres medallion */}
        <rect x="440" y="20" width="180" height="140" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="530" y="40" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="700">PostgreSQL</text>
        <rect x="455" y="52" width="150" height="26" rx="5" fill="var(--bg)" stroke="var(--border)" />
        <text x="530" y="69" textAnchor="middle" fontSize="10" fill="var(--muted)">bronze — raw JSON</text>
        <rect x="455" y="84" width="150" height="26" rx="5" fill="var(--bg)" stroke="var(--border)" />
        <text x="530" y="101" textAnchor="middle" fontSize="10" fill="var(--muted)">silver — cleaned</text>
        <rect x="455" y="116" width="150" height="26" rx="5" fill="var(--bg)" stroke="var(--accent1)" />
        <text x="530" y="133" textAnchor="middle" fontSize="10" fill="var(--accent1)" fontWeight="600">gold — star schema (dbt)</text>

        <line x1="390" y1="80" x2="440" y2="80" stroke="var(--muted)" markerEnd="url(#arrow)" />

        {/* pgvector branch */}
        <rect x="440" y="190" width="180" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="530" y="210" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">pgvector</text>
        <text x="530" y="226" textAnchor="middle" fontSize="10" fill="var(--muted)">case study embeddings</text>
        <line x1="530" y1="160" x2="530" y2="190" stroke="var(--muted)" markerEnd="url(#arrow)" />

        {/* Django */}
        <rect x="680" y="70" width="160" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="760" y="90" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Django + DRF</text>
        <text x="760" y="106" textAnchor="middle" fontSize="10" fill="var(--muted)">REST API</text>
        <line x1="620" y1="90" x2="680" y2="95" stroke="var(--muted)" markerEnd="url(#arrow)" />

        {/* Gemini */}
        <rect x="680" y="150" width="160" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="760" y="170" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">Gemini API</text>
        <text x="760" y="186" textAnchor="middle" fontSize="10" fill="var(--muted)">router · text-to-SQL · RAG</text>
        <line x1="620" y1="215" x2="680" y2="180" stroke="var(--muted)" markerEnd="url(#arrow)" />
        <line x1="760" y1="150" x2="760" y2="120" stroke="var(--muted)" markerEnd="url(#arrow)" />

        {/* React */}
        <rect x="440" y="270" width="180" height="50" rx="8" fill="var(--bg-alt)" stroke="var(--border)" />
        <text x="530" y="290" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">React (Vite)</text>
        <text x="530" y="306" textAnchor="middle" fontSize="10" fill="var(--muted)">production build</text>
        <line x1="760" y1="120" x2="760" y2="295" stroke="var(--muted)" />
        <line x1="760" y1="295" x2="620" y2="295" stroke="var(--muted)" markerEnd="url(#arrow)" />

        {/* Infra row */}
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
          Self-hosted on a single VPS — every box above is a container this site actually runs.
        </text>
      </svg>

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
          <strong style={{ color: 'var(--text)' }}>Self-hosted, not managed:</strong> every piece — Postgres, Jenkins, Django,
          React — runs in Docker on a single VPS I administer directly, giving full control over cost and configuration
          at the expense of the convenience managed services provide.
        </p>
        <p>
          <strong style={{ color: 'var(--text)' }}>RAG grounded in real data:</strong> the chat assistant routes questions
          to either live SQL over the gold schema or vector retrieval over embedded case study content — it's built to say
          "I don't know" rather than hallucinate when source material doesn't cover something.
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