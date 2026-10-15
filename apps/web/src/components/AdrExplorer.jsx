import { useState, useMemo } from 'react'
import {
  Search, X, ChevronDown, Brain, Workflow, Database, Server, Compass, Layers,
  Gavel, Scale, SearchX, ChevronsUpDown, ChevronsDownUp,
} from 'lucide-react'

// Category comes from the ADR title, so new ADRs are filed automatically.
const CATS = [
  { key: 'infra', label: 'Infrastructure', icon: Server, color: '#10B981',
    words: ['self-hosted', 'hosted', 'warehouse', 'terraform', 'docker', 'cloud', 'managed'] },
  { key: 'ai', label: 'AI & ML', icon: Brain, color: '#8B5CF6',
    words: ['gemini', 'openai', 'rag', 'llm', 'embedding', 'model', 'forecast'] },
  { key: 'orch', label: 'Orchestration', icon: Workflow, color: '#F59E0B',
    words: ['airflow', 'jenkins', 'dag', 'orchestrat', 'schedul'] },
  { key: 'data', label: 'Data Design', icon: Database, color: '#06B6D4',
    words: ['bronze', 'silver', 'gold', 'layer', 'append', 'time-series', 'data source', 'pypi', 'github', 'count', 'schema', 'revert'] },
]
const FALLBACK = { key: 'general', label: 'Architecture', icon: Layers, color: '#2563EB', words: [] }

const SECTIONS = [
  { key: 'context', label: 'Context', icon: Compass },
  { key: 'decision', label: 'Decision', icon: Gavel },
  { key: 'consequences', label: 'Trade-offs', icon: Scale },
]

const PAGE = 5

function enrich(a) {
  const title = (a.title || '').toLowerCase()
  const cats = CATS.filter((c) => c.words.some((w) => title.includes(w)))
  const d = a.created_at ? new Date(a.created_at) : null
  return {
    ...a,
    cats,
    primary: cats[0] || FALLBACK,
    num: `ADR-${String(a.id).padStart(2, '0')}`,
    when: d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '',
    hay: `${a.title} ${a.decision} ${a.context} ${a.consequences}`.toLowerCase(),
  }
}

export default function AdrExplorer({ adrs }) {
  const items = useMemo(() => (adrs || []).map(enrich), [adrs])
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState(() => new Set())
  const [seeded, setSeeded] = useState(false)

  // Open the newest decision once data arrives.
  if (!seeded && items.length) {
    setSeeded(true)
    setOpen(new Set([items[0].id]))
  }

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
        const ok = cat === 'general' ? i.cats.length === 0 : i.cats.some((c) => c.key === cat)
        if (!ok) return false
      }
      return words.every((w) => i.hay.includes(w))
    })
  }, [items, cat, query])

  const visible = filtered.slice(0, limit)
  const remaining = filtered.length - visible.length
  const allOpen = visible.length > 0 && visible.every((i) => open.has(i.id))

  const toggle = (id) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })
  const toggleAll = () => setOpen((s) => {
    const n = new Set(s)
    visible.forEach((i) => (allOpen ? n.delete(i.id) : n.add(i.id)))
    return n
  })
  const pick = (k) => { setCat(k); setLimit(PAGE) }
  const reset = () => { setCat('all'); setQuery(''); setLimit(PAGE) }

  return (
    <>
      <div className="sx-head">
        <div>
          <div className="eyebrow">Architecture Decisions</div>
          <p className="sx-sub">The why behind the stack: each decision with its context and trade-offs. Newest first.</p>
        </div>
        <span className="sx-count">{items.length} {items.length === 1 ? 'decision' : 'decisions'}</span>
      </div>

      <div className="cs-toolbar">
        <label className="cs-search">
          <Search size={15} />
          <input type="text" value={query} placeholder="Search decisions (e.g. airflow, bronze, gemini)"
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }} aria-label="Search decisions" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <div className="adx-row">
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
          {visible.length > 0 && (
            <button className="adx-toggleall" onClick={toggleAll}>
              {allOpen ? <><ChevronsDownUp size={14} /> Collapse all</> : <><ChevronsUpDown size={14} /> Expand all</>}
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="sx-empty">
          <SearchX size={28} />
          <p>No decisions match your filters.</p>
          <button onClick={reset}>Reset filters</button>
        </div>
      ) : (
        <ol className="adx-list">
          {visible.map((a) => {
            const Icon = a.primary.icon
            const isOpen = open.has(a.id)
            const secs = SECTIONS.filter((s) => (a[s.key] || '').trim())
            return (
              <li className={`adx-item${isOpen ? ' open' : ''}`} key={a.id} style={{ '--c': a.primary.color }}>
                <span className="adx-node"><Icon size={15} /></span>
                <div className="adx-card">
                  <button className="adx-head" aria-expanded={isOpen} aria-controls={`adx-${a.id}`} onClick={() => toggle(a.id)}>
                    <span className="adx-num">{a.num}</span>
                    <span className="adx-title">{a.title}</span>
                    <span className="adx-meta">
                      <span className="cs-cat" style={{ '--c': a.primary.color }}>{a.primary.label}</span>
                      {a.when && <span className="adx-when">{a.when}</span>}
                    </span>
                    <ChevronDown size={17} className="adx-chev" />
                  </button>
                  {!isOpen && a.decision && <p className="adx-preview">{a.decision}</p>}
                  <div className="adx-body" id={`adx-${a.id}`}>
                    <div className="adx-body-inner">
                      <div className={`adx-secs n${secs.length}`}>
                        {secs.map((s) => {
                          const SIcon = s.icon
                          return (
                            <section key={s.key} className={s.key === 'decision' ? 'adx-sec decision' : 'adx-sec'}>
                              <h5><SIcon size={13} /> {s.label}</h5>
                              <p>{a[s.key]}</p>
                            </section>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {(remaining > 0 || limit > PAGE) && filtered.length > PAGE && (
        <div className="sx-more">
          {remaining > 0 && (
            <button onClick={() => setLimit(limit + PAGE)}>
              Show {Math.min(PAGE, remaining)} earlier {Math.min(PAGE, remaining) === 1 ? 'decision' : 'decisions'} <ChevronDown size={15} />
            </button>
          )}
          {limit > PAGE && remaining <= 0 && <button onClick={() => setLimit(PAGE)}>Show less</button>}
        </div>
      )}
    </>
  )
}
