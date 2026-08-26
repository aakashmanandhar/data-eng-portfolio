import { useState, useEffect, useRef } from 'react'
import { Briefcase, GraduationCap, MapPin, Landmark, Milestone, ScrollText, CalendarClock, ChevronDown, Building, Award, Languages as LanguagesIcon, Users, CheckCircle2, Clock3, ExternalLink, MessageCircleQuestion } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const TABS = [
  { key: 'experience', label: 'Experience', Icon: Briefcase },
  { key: 'education', label: 'Education', Icon: GraduationCap },
  { key: 'credentials', label: 'Credentials', Icon: Award },
]

const EMPLOYMENT_LABELS = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  freelance: 'Freelance',
  contract: 'Contract',
}

function formatDate(dateStr) {
  if (!dateStr) return 'Present'
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${month}/${d.getFullYear()}`
}

function yearsBetween(start, end) {
  const startD = new Date(start)
  const endD = end ? new Date(end) : new Date()
  return (endD - startD) / (1000 * 60 * 60 * 24 * 365.25)
}

function formatDuration(start, end) {
  const totalMonths = Math.round(yearsBetween(start, end) * 12)
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${months} mo`
  if (months === 0) return `${years} yr`
  return `${years} yr ${months} mo`
}

function CompanyMark({ logoUrl, name, kind = 'company' }) {
  const FallbackIcon = kind === 'education' ? GraduationCap : Building
  return (
    <div className="cv-mark-wrap">
      {logoUrl
        ? <img src={logoUrl} alt={name} className="cv-mark" />
        : <div className="cv-mark cv-mark-fallback"><FallbackIcon size={18} strokeWidth={2} /></div>}
    </div>
  )
}

function useRevealOnScroll() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) { setVisible(true); return }

    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, visible]
}

function useCountUp(target, duration = 1000, start = false) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!start) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) { setValue(target); return }

    let startTime = null
    let raf
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, start])

  return value
}

function TimelineEntry({ index, date, endDate, startDate, isCurrent, title, subtitle, metaBits, note, highlights, skills, logoUrl, logoName, activeSkill, onSkillClick, dimmed, variant = 'experience', hideDuration = false, markKind = 'company' }) {
  const [ref, visible] = useRevealOnScroll()
  const [expanded, setExpanded] = useState(index === 0)
  const hasMoreThanTwo = highlights?.length > 2
  const visibleHighlights = expanded || !hasMoreThanTwo ? highlights : highlights?.slice(0, 2)

  return (
    <div
      ref={ref}
      className={`cv-entry cv-entry-${variant} ${isCurrent ? 'cv-entry-current' : ''} ${visible ? 'cv-entry-visible' : ''} ${dimmed ? 'cv-entry-dimmed' : ''}`}
      style={{ transitionDelay: visible ? `${Math.min(index, 6) * 60}ms` : '0ms' }}
    >
      <div className="cv-entry-rail">
        <div className="cv-entry-dot">{isCurrent && <div className="cv-entry-dot-pulse" />}</div>
        <div className="cv-entry-line" />
      </div>
      <div className="cv-entry-date">
        <span className="cv-entry-date-text">{date}</span>
        {!hideDuration && <span className="cv-duration-chip">{formatDuration(startDate, endDate)}</span>}
        {isCurrent && <span className="cv-current-badge">Current</span>}
      </div>
      <div className="cv-entry-card">
        <div className="cv-entry-head">
          <CompanyMark logoUrl={logoUrl} name={logoName} kind={markKind} />
          <div className="cv-entry-head-text">
            <div className="cv-entry-title">{title}</div>
            <div className="cv-entry-company-line">
              <Building size={12} className="cv-entry-company-icon" />
              <span className="cv-entry-company">{subtitle}</span>
            </div>
            {metaBits?.length > 0 && (
              <div className="cv-entry-chips">
                {metaBits.map((bit, i) => (
                  <span key={i} className="cv-meta-chip">
                    {i === metaBits.length - 1 && <MapPin size={10} />}
                    {bit}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {note && <div className="cv-entry-note">{note}</div>}
        {visibleHighlights?.length > 0 && (
          <ul className="cv-entry-highlights">
            {visibleHighlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        )}
        {hasMoreThanTwo && (
          <button className="cv-expand-btn" onClick={() => setExpanded(e => !e)}>
            <ChevronDown size={13} className={expanded ? 'cv-expand-icon-open' : ''} />
            {expanded ? 'Show less' : `Show ${highlights.length - 2} more`}
          </button>
        )}
        {skills?.length > 0 && (
          <div className="cv-entry-skills">
            {skills.map((s, i) => (
              <span
                key={i}
                className={`cv-skill-pill ${activeSkill === s ? 'cv-skill-pill-active' : ''}`}
                onClick={() => onSkillClick?.(s)}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const DATA_ENGINEERING_START_DATE = '2018-05-01'

function computeStats(data) {
  if (!data) return null
  const totalYears = yearsBetween(DATA_ENGINEERING_START_DATE, null)
  return {
    years: Math.round(totalYears),
    companies: new Set(data.experience.map(e => e.company)).size,
    roles: data.experience.length,
    degrees: data.education.length,
  }
}

function StatCard({ Icon, target, label, suffix = '', delay }) {
  const [ref, visible] = useRevealOnScroll()
  const count = useCountUp(target, 900, visible)
  return (
    <div className="cv-stat-card" ref={ref} style={{ transitionDelay: `${delay}ms` }}>
      <div className="cv-stat-icon"><Icon size={16} /></div>
      <div>
        <div className="cv-stat-value">{count}{suffix}</div>
        <div className="cv-stat-label">{label}</div>
      </div>
    </div>
  )
}

export function CareerStats({ data }) {
  const stats = computeStats(data)
  if (!stats) return null
  const items = [
    { Icon: CalendarClock, value: stats.years, suffix: '+', label: 'Years Experience' },
    { Icon: Landmark, value: stats.companies, suffix: '', label: 'Companies' },
    { Icon: Milestone, value: stats.roles, suffix: '', label: 'Positions' },
    { Icon: ScrollText, value: stats.degrees, suffix: '', label: 'Degrees' },
  ]
  return (
    <div className="cv-stats-row">
      {items.map((it, i) => (
        <StatCard key={i} Icon={it.Icon} target={it.value} suffix={it.suffix} label={it.label} delay={i * 80} />
      ))}
    </div>
  )
}

function CredentialsPanel({ certifications, languages, references }) {
  const proficiencyLevel = {
    native: 5,
    full_professional: 5,
    professional: 4,
    intermediate: 3,
    basic: 2,
  }

  return (
    <div className="cv-credentials">
      {certifications?.length > 0 && (
        <div className="cv-cred-block">
          <div className="cv-cred-block-title"><Award size={14} /> Certifications</div>
          <div className="cv-cert-grid">
            {certifications.map((c) => (
              <div key={c.id} className={`cv-cert-card ${c.status === 'in_progress' ? 'cv-cert-card-progress' : 'cv-cert-card-done'}`}>
                <div className="cv-cert-card-top">
                  <div className="cv-cert-card-icon">
                    {c.status === 'completed'
                      ? <CheckCircle2 size={16} />
                      : <Clock3 size={16} />}
                  </div>
                  <span className="cv-cert-status-badge">
                    {c.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                </div>
                <div className="cv-cert-card-name">{c.name}</div>
                <div className="cv-cert-card-issuer">{c.issuer}</div>
                {c.status === 'in_progress' && c.target_date_note && (
                  <div className="cv-cert-card-note">{c.target_date_note}</div>
                )}
                {c.credential_url && (
                  <a href={c.credential_url} target="_blank" rel="noopener noreferrer" className="cv-cert-card-link">
                    <ExternalLink size={11} /> View credential
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {languages?.length > 0 && (
        <div className="cv-cred-block">
          <div className="cv-cred-block-title"><LanguagesIcon size={14} /> Languages</div>
          <div className="cv-lang-grid">
            {languages.map((l) => {
              const level = proficiencyLevel[l.proficiency] || 3
              return (
                <div key={l.id} className="cv-lang-card">
                  <div className="cv-lang-card-top">
                    <span className="cv-lang-name">{l.name}</span>
                    <span className="cv-lang-level">{l.proficiency_display}</span>
                  </div>
                  <div className="cv-lang-dots">
                    {[1, 2, 3, 4, 5].map(i => (
                      <span key={i} className={`cv-lang-dot ${i <= level ? 'cv-lang-dot-filled' : ''}`} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="cv-cred-block">
        <div className="cv-cred-block-title"><Users size={14} /> References</div>
        <div className="cv-references-card">
          <MessageCircleQuestion size={18} className="cv-references-icon" />
          <div>
            <div className="cv-references-title">Available upon request</div>
            <div className="cv-references-subtitle">Professional references can be provided during the interview process.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CareerTimeline({ onDataLoaded }) {
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('experience')
  const [error, setError] = useState(null)
  const tabRefs = useRef([])
  const [indicatorStyle, setIndicatorStyle] = useState({})
  const [activeSkill, setActiveSkill] = useState(null)

  const toggleSkill = (skill) => setActiveSkill(prev => prev === skill ? null : skill)

  useEffect(() => {
    fetch(`${API_BASE}/api/career-timeline/`)
      .then(res => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        return res.json()
      })
      .then(d => { setData(d); onDataLoaded?.(d) })
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    const activeIndex = TABS.findIndex(t => t.key === activeTab)
    const el = tabRefs.current[activeIndex]
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [activeTab, data])

  if (error) return <div className="cv-error">Career data could not be loaded. {error}</div>
  if (!data) return <div className="cv-loading">Loading career history…</div>

  return (
    <div className="cv-section">
      <div className="cv-tabs">
        <div className="cv-tab-indicator" style={indicatorStyle} />
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            ref={el => tabRefs.current[i] = el}
            className={`cv-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.Icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="cv-timeline" key={activeTab}>
        {activeTab === 'experience' && data.experience.map((entry, i) => (
          <TimelineEntry
            key={entry.id}
            index={i}
            date={`${formatDate(entry.start_date)} – ${formatDate(entry.end_date)}`}
            startDate={entry.start_date}
            endDate={entry.end_date}
            isCurrent={!entry.end_date}
            title={entry.role}
            subtitle={entry.company}
            logoUrl={entry.company_logo}
            logoName={entry.company}
            metaBits={[
              EMPLOYMENT_LABELS[entry.employment_type] || entry.employment_type,
              entry.is_remote ? 'Remote' : entry.location,
            ].filter(Boolean)}
            highlights={entry.highlights?.map(h => h.text)}
            skills={entry.skills}
            activeSkill={activeSkill}
            onSkillClick={toggleSkill}
            dimmed={activeSkill && !entry.skills?.includes(activeSkill)}
          />
        ))}
        {activeTab === 'credentials' && (
          <CredentialsPanel
            certifications={data.certifications}
            languages={data.languages}
            references={data.references}
          />
        )}
        {activeTab === 'education' && data.education.map((entry, i) => (
          <TimelineEntry
            key={entry.id}
            index={i}
            variant="education"
            date={`${formatDate(entry.start_date)} – ${formatDate(entry.end_date)}`}
            startDate={entry.start_date}
            endDate={entry.end_date}
            isCurrent={!entry.end_date}
            title={entry.degree}
            subtitle={entry.institution}
            logoUrl={entry.logo}
            logoName={entry.institution}
            markKind="education"
            metaBits={entry.location ? [entry.location] : []}
            hideDuration
            note={entry.thesis_or_note}
            skills={entry.skills}
            activeSkill={activeSkill}
            onSkillClick={toggleSkill}
            dimmed={activeSkill && !entry.skills?.includes(activeSkill)}
          />
        ))}
      </div>
    </div>
  )
}

export default CareerTimeline
