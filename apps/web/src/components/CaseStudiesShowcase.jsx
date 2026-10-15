import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  Search, X, ArrowRight, Star, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Brain, Workflow, Cloud, Radio, Globe, Server, Layers, Boxes, Target, TrendingUp, SearchX,
} from 'lucide-react'

// Categories are derived from each case study's tech_stack, so adding a new
// case study in Django admin automatically files it under the right filter.
const CATS = [
  { key: 'ai', label: 'AI / ML', icon: Brain, color: '#8B5CF6',
    words: ['scikit-learn', 'mlflow', 'lightgbm', 'gemini', 'vertex', 'pgvector', 'sentence-transformers', 'feast'] },
  { key: 'stream', label: 'Streaming', icon: Radio, color: '#EF4444', words: ['kafka'] },
  { key: 'cloud', label: 'Cloud & Lakehouse', icon: Cloud, color: '#06B6D4',
    words: ['databricks', 'unity catalog', 'delta lake', 'bigquery', 'gcp', 'cloudflare'] },
  { key: 'orch', label: 'Orchestration', icon: Workflow, color: '#F59E0B',
    words: ['airflow', 'jenkins', 'github actions', 'lakeflow', 'asset bundles', 'cloud build'] },
  { key: 'web', label: 'Full-stack', icon: Globe, color: '#2563EB',
    words: ['react', 'django', 'fastapi', 'flask', 'vite', 'typescript'] },
  { key: 'infra', label: 'Infrastructure', icon: Server, color: '#10B981', words: ['terraform', 'docker', 'nginx'] },
]
const FALLBACK = { key: 'other', label: 'Platform', icon: Layers, color: '#2563EB', words: [] }

const TABS = [
  { key: 'problem', label: 'Problem', icon: Target },
  { key: 'architecture', label: 'Architecture', icon: Boxes },
  { key: 'outcome', label: 'Outcome', icon: TrendingUp },
]

const PAGE = 6

function enrich(cs) {
  const techs = (cs.tech_stack || '').split(',').map((t) => t.trim()).filter(Boolean)
  // Order in CATS is the priority: the first match becomes the card's icon/colour.
  const cats = CATS.filter((c) => techs.some((t) => c.words.some((w) => t.toLowerCase().includes(w))))
  return {
    ...cs,
    techs,
    cats,
    primary: cats[0] || FALLBACK,
    hay: `${cs.title} ${cs.summary} ${techs.join(' ')}`.toLowerCase(),
  }
}

function Pills({ techs, max }) {
  const shown = max ? techs.slice(0, max) : techs
  const extra = techs.length - shown.length
  return (
    <div className="cs-pills">
      {shown.map((t) => <span className="cs-pill" key={t}>{t}</span>)}
      {extra > 0 && <span className="cs-pill cs-pill-more">+{extra}</span>}
    </div>
  )
}

function IconTile({ cat, size = 40 }) {
  const Icon = cat.icon
  return (
    <span className="cs-icon" style={{ '--c': cat.color, width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={2} />
    </span>
  )
}

function QuickView({ item, index, total, onClose, onPrev, onNext }) {
  const tabs = TABS.filter((t) => (item[t.key] || '').trim())
  const [tab, setTab] = useState(tabs[0]?.key)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => { closeRef.current?.focus() }, [])

  const onKeyDown = (e) => {
    if (e.key !== 'Tab') return
    const f = dialogRef.current?.querySelectorAll('a[href], button:not([disabled])')
    if (!f || !f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  return (
    <div className="cs-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cs-dialog" role="dialog" aria-modal="true" aria-label={item.title}
        ref={dialogRef} onKeyDown={onKeyDown} style={{ '--c': item.primary.color }}>
        <div className="cs-dialog-head">
          <IconTile cat={item.primary} size={44} />
          <div className="cs-dialog-title">
            <div className="cs-cats">
              {(item.cats.length ? item.cats : [FALLBACK]).slice(0, 3).map((c) => (
                <span className="cs-cat" key={c.key} style={{ '--c': c.color }}>{c.label}</span>
              ))}
              {item.is_featured && <span className="cs-cat cs-cat-star"><Star size={11} fill="currentColor" /> Featured</span>}
            </div>
            <h3>{item.title}</h3>
          </div>
          <button className="cs-x" ref={closeRef} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <p className="cs-dialog-summary">{item.summary}</p>

        {tabs.length > 0 && (
          <>
            <div className="cs-tabs" role="tablist">
              {tabs.map((t) => {
                const Icon = t.icon
                return (
                  <button key={t.key} role="tab" aria-selected={tab === t.key}
                    className={`cs-tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
                    <Icon size={14} /> {t.label}
                  </button>
                )
              })}
            </div>
            <div className="cs-tabpanel" role="tabpanel">{item[tab]}</div>
          </>
        )}

        <Pills techs={item.techs} />

        <div className="cs-dialog-foot">
          <div className="cs-nav">
            <button onClick={onPrev} disabled={index <= 0} aria-label="Previous case study"><ChevronLeft size={16} /></button>
            <span>{index + 1} / {total}</span>
            <button onClick={onNext} disabled={index >= total - 1} aria-label="Next case study"><ChevronRight size={16} /></button>
          </div>
          <Link to={`/case-studies/${item.slug}`} className="cs-cta">
            Read full case study <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CaseStudiesShowcase({ caseStudies }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [limit, setLimit] = useState(PAGE)
  const [activeId, setActiveId] = useState(null)
  const openerRef = useRef(null)

  const items = useMemo(() => (caseStudies || []).map(enrich), [caseStudies])

  const chips = useMemo(() => {
    const list = CATS.map((c) => ({ ...c, count: items.filter((i) => i.cats.includes(c)).length }))
      .filter((c) => c.count > 0)
    const other = items.filter((i) => i.cats.length === 0).length
    if (other) list.push({ ...FALLBACK, count: other })
    return list
  }, [items])

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter((i) => {
      if (cat !== 'all') {
        const ok = cat === 'other' ? i.cats.length === 0 : i.cats.some((c) => c.key === cat)
        if (!ok) return false
      }
      return words.every((w) => i.hay.includes(w))
    })
  }, [items, cat, query])

  const hero = cat === 'all' && !query.trim() ? filtered.find((i) => i.is_featured) : null
  const rest = hero ? filtered.filter((i) => i.id !== hero.id) : filtered
  const visible = rest.slice(0, limit)
  const remaining = rest.length - visible.length

  const activeIndex = activeId == null ? -1 : filtered.findIndex((i) => i.id === activeId)
  const active = activeIndex >= 0 ? filtered[activeIndex] : null

  const open = (id) => { openerRef.current = document.activeElement; setActiveId(id) }
  const close = () => {
    setActiveId(null)
    const el = openerRef.current
    if (el && el.focus) setTimeout(() => el.focus(), 0)
  }
  const go = (d) => {
    const n = filtered[activeIndex + d]
    if (n) setActiveId(n.id)
  }

  useEffect(() => {
    if (!active) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  })

  const pick = (k) => { setCat(k); setLimit(PAGE) }
  const reset = () => { setCat('all'); setQuery(''); setLimit(PAGE) }

  return (
    <>
      <div className="sx-head">
        <div>
          <div className="eyebrow">Case Studies</div>
          <p className="sx-sub">Real systems I designed and shipped. Filter by stack, or open a quick view without leaving the page.</p>
        </div>
        <span className="sx-count">{items.length} {items.length === 1 ? 'project' : 'projects'}</span>
      </div>

      <div className="cs-toolbar">
        <label className="cs-search">
          <Search size={15} />
          <input type="text" value={query} placeholder="Search projects or tech (e.g. airflow, kafka)"
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }} aria-label="Search case studies" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <div className="cs-chips" role="group" aria-label="Filter by category">
          <button className={`cs-chip${cat === 'all' ? ' on' : ''}`} onClick={() => pick('all')}>
            All <b>{items.length}</b>
          </button>
          {chips.map((c) => {
            const Icon = c.icon
            return (
              <button key={c.key} className={`cs-chip${cat === c.key ? ' on' : ''}`}
                style={{ '--c': c.color }} onClick={() => pick(c.key)}>
                <Icon size={13} /> {c.label} <b>{c.count}</b>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="sx-empty">
          <SearchX size={28} />
          <p>No case studies match your filters.</p>
          <button onClick={reset}>Reset filters</button>
        </div>
      ) : (
        <>
          {hero && (
            <article className="cs-hero" style={{ '--c': hero.primary.color }} onClick={() => open(hero.id)}>
              <div className="cs-hero-top">
                <span className="cs-cat cs-cat-star"><Star size={11} fill="currentColor" /> Featured</span>
                {hero.cats.slice(0, 2).map((c) => (
                  <span className="cs-cat" key={c.key} style={{ '--c': c.color }}>{c.label}</span>
                ))}
              </div>
              <div className="cs-hero-body">
                <IconTile cat={hero.primary} size={52} />
                <div>
                  <h3><button onClick={(e) => { e.stopPropagation(); open(hero.id) }}>{hero.title}</button></h3>
                  <p>{hero.summary}</p>
                  <Pills techs={hero.techs} max={12} />
                </div>
              </div>
              <div className="cs-hero-actions" onClick={(e) => e.stopPropagation()}>
                <button className="cs-ghost" onClick={() => open(hero.id)}>Quick view</button>
                <Link to={`/case-studies/${hero.slug}`} className="cs-cta">Read case study <ArrowRight size={15} /></Link>
              </div>
            </article>
          )}

          <div className="cs-grid">
            {visible.map((i, n) => (
              <article className="cs-card" key={i.id} style={{ '--c': i.primary.color, '--i': n }} onClick={() => open(i.id)}>
                <div className="cs-card-top">
                  <IconTile cat={i.primary} />
                  <span className="cs-cat" style={{ '--c': i.primary.color }}>{i.primary.label}</span>
                </div>
                <h3><button onClick={(e) => { e.stopPropagation(); open(i.id) }}>{i.title}</button></h3>
                <p>{i.summary}</p>
                <Pills techs={i.techs} max={4} />
                <div className="cs-card-foot" onClick={(e) => e.stopPropagation()}>
                  <button className="cs-ghost" onClick={() => open(i.id)}>Quick view</button>
                  <Link to={`/case-studies/${i.slug}`} className="cs-link" aria-label={`Read case study: ${i.title}`}>
                    Read <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {(remaining > 0 || limit > PAGE) && rest.length > PAGE && (
            <div className="sx-more">
              {remaining > 0 && (
                <button onClick={() => setLimit(limit + PAGE)}>
                  Show {Math.min(PAGE, remaining)} more <ChevronDown size={15} />
                </button>
              )}
              {limit > PAGE && remaining <= 0 && (
                <button onClick={() => setLimit(PAGE)}>Show less <ChevronUp size={15} /></button>
              )}
            </div>
          )}
        </>
      )}

      {active && createPortal(
        <QuickView key={active.id} item={active} index={activeIndex} total={filtered.length}
          onClose={close} onPrev={() => go(-1)} onNext={() => go(1)} />,
        document.body,
      )}
    </>
  )
}
