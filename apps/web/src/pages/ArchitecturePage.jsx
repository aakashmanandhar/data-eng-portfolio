import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Moon, Sun, Play, Pause, ChevronLeft, ChevronRight, Search, SearchX, Clock, Database,
  Sparkles, Github, ArrowUpRight, Table2, ChevronDown, Layers
} from 'lucide-react'
import {
  SECTIONS, STATS, FLOW, GROUPS, PIPELINES, MODEL_CATS, ML_MODELS, CAT_META, PRINCIPLES, STACK
} from './archData'
import '../App.css'

const REPO_URL = 'https://github.com/aakashmanandhar/data-eng-portfolio'
const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function CountUp({ to, suffix = '' }) {
  const [n, setN] = useState(reduced() ? to : 0)
  useEffect(() => {
    if (reduced()) return undefined
    let raf
    const t0 = performance.now()
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 1000)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{n}{suffix}</>
}

function SectionHead({ id, eyebrow, title, sub, right }) {
  return (
    <header className="ar-head">
      <div>
        <div className="ar-eyebrow">{eyebrow}</div>
        <h2 id={`${id}-h`}>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </header>
  )
}

function ArchitecturePage() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [scrolled, setScrolled] = useState(false)
  const [activeSec, setActiveSec] = useState('')
  const [flowIdx, setFlowIdx] = useState(0)
  const [playing, setPlaying] = useState(() => !reduced())
  const [flowSeen, setFlowSeen] = useState(false)
  const [group, setGroup] = useState('all')
  const [openId, setOpenId] = useState('research')
  const [cat, setCat] = useState('All')
  const [query, setQuery] = useState('')
  const [openP, setOpenP] = useState({})
  const progress = useRef(null)
  const flowRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch { /* private mode */ }
  }, [theme])

  useEffect(() => {
    window.scrollTo(0, 0)
    const prev = document.title
    document.title = 'Architecture | Aakash Manandhar'
    return () => { document.title = prev }
  }, [])
  // progress bar, header state and active section (scroll-spy)
  useEffect(() => {
    let tick = false
    const run = () => {
      tick = false
      const y = window.scrollY
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      setScrolled(y > 160)
      if (progress.current) progress.current.style.transform = `scaleX(${Math.min(1, y / max)})`
      let cur = ''
      SECTIONS.forEach((s) => {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= 140) cur = s.id
      })
      if (y + window.innerHeight >= document.documentElement.scrollHeight - 4) cur = SECTIONS[SECTIONS.length - 1].id
      setActiveSec(cur)
    }
    const onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(run) } }
    run()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  // scroll-reveal
  useEffect(() => {
    const els = [...document.querySelectorAll('.ar-rv')]
    if (reduced() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return undefined }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.08 })
    els.forEach((e) => { e.classList.add('rv'); io.observe(e) })
    return () => io.disconnect()
  }, [])

  // data-flow diagram: autoplay only while it is on screen
  useEffect(() => {
    const el = flowRef.current
    if (!el || !('IntersectionObserver' in window)) { setFlowSeen(true); return undefined }
    const io = new IntersectionObserver(([e]) => setFlowSeen(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!playing || !flowSeen) return undefined
    const t = setInterval(() => setFlowIdx((i) => (i + 1) % FLOW.length), 5200)
    return () => clearInterval(t)
  }, [playing, flowSeen])

  const pick = (i) => { setFlowIdx((i + FLOW.length) % FLOW.length); setPlaying(false) }

  const goTo = (id) => {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 112, behavior: reduced() ? 'auto' : 'smooth' })
  }

  const list = useMemo(() => PIPELINES.filter((p) => group === 'all' || p.group === group), [group])
  const sel = list.find((p) => p.id === openId) || list[0]
  const counts = useMemo(() => {
    const c = { all: PIPELINES.length }
    PIPELINES.forEach((p) => { c[p.group] = (c[p.group] || 0) + 1 })
    return c
  }, [])

  const models = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ML_MODELS.filter(([name, tech, desc, c]) =>
      (cat === 'All' || c === cat) && (!q || `${name} ${tech} ${desc} ${c}`.toLowerCase().includes(q)))
  }, [cat, query])
  const catCount = (c) => (c === 'All' ? ML_MODELS.length : ML_MODELS.filter((m) => m[3] === c).length)

  const node = FLOW[flowIdx]
  const NodeIcon = node.icon
  return (
    <>
      <div className={`cd-bar${scrolled ? ' scrolled' : ''}`}>
        <div className="cd-bar-in">
          <Link to="/" className="cd-back"><ArrowLeft size={15} /> <span>Portfolio</span></Link>
          <span className="cd-bar-title">How this site works</span>
          <div className="cd-bar-actions">
            <a className="cd-btn sm" href={REPO_URL} target="_blank" rel="noopener noreferrer"><Github size={14} /> <span>Source</span></a>
            <button type="button" className="cd-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>
        <div className="cd-progress" aria-hidden="true"><i ref={progress} /></div>
      </div>

      <nav className="ar-nav" aria-label="Sections">
        <div className="ar-nav-in">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className={activeSec === s.id ? 'on' : ''} onClick={() => goTo(s.id)}>{s.label}</button>
          ))}
        </div>
      </nav>

      <main className="ar-page">
        <section className="ar-hero">
          <div className="ar-eyebrow"><Sparkles size={13} /> Platform architecture</div>
          <h1>How this site works</h1>
          <p>
            This portfolio isn't a static page describing my work. It is a live, self-hosted data platform:
            eight independently orchestrated pipelines, 15+ trained ML models, two self-healing AI agents and one RAG
            assistant grounded in all of it. Explore the architecture behind every piece.
          </p>
          <div className="ar-stats">
            {STATS.map((s) => (
              <div key={s.label} className="ar-stat" style={{ '--c': s.color }}>
                <span className="ar-stat-ic"><s.icon size={18} /></span>
                <div><strong><CountUp to={s.value} suffix={s.suffix} /></strong><small>{s.label}</small></div>
              </div>
            ))}
          </div>
        </section>

        <section id="flow" className="ar-sec ar-rv" aria-labelledby="flow-h">
          <SectionHead id="flow" eyebrow="End to end" title="From raw API to what you see"
            sub="Seven stages. Click one, or let it play."
            right={(
              <button type="button" className="cd-btn sm" onClick={() => setPlaying(!playing)} aria-pressed={playing}>
                {playing ? <Pause size={13} /> : <Play size={13} />} <span>{playing ? 'Pause' : 'Play tour'}</span>
              </button>
            )} />
          <div className="ar-flow" ref={flowRef} role="tablist" aria-label="Data flow stages">
            {FLOW.map((n, i) => (
              <Fragment key={n.id}>
                <button type="button" role="tab" aria-selected={i === flowIdx} style={{ '--c': n.color }}
                  className={`ar-node${i === flowIdx ? ' on' : ''}${i < flowIdx ? ' done' : ''}`} onClick={() => pick(i)}>
                  <span className="ar-node-ic"><n.icon size={20} /></span>
                  <span className="ar-node-t"><b>{n.title}</b><small>{n.short}</small></span>
                </button>
                {i < FLOW.length - 1 && <span className={`ar-link${i < flowIdx ? ' done' : ''}${i === flowIdx ? ' live' : ''}`} aria-hidden="true"><i /></span>}
              </Fragment>
            ))}
          </div>
          <div className="ar-panel" key={flowIdx} style={{ '--c': node.color }} role="tabpanel">
            <div className="ar-panel-top">
              <span className="ar-panel-ic"><NodeIcon size={22} /></span>
              <div><small>Stage {flowIdx + 1} of {FLOW.length}</small><h3>{node.title}</h3></div>
              <div className="ar-panel-nav">
                <button type="button" className="cd-icon" onClick={() => pick(flowIdx - 1)} aria-label="Previous stage"><ChevronLeft size={16} /></button>
                <button type="button" className="cd-icon" onClick={() => pick(flowIdx + 1)} aria-label="Next stage"><ChevronRight size={16} /></button>
              </div>
            </div>
            <p>{node.text}</p>
            <ul>{node.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <div className="ar-chips">{node.chips.map((c) => <span key={c}>{c}</span>)}</div>
            {playing && flowSeen && <i className="ar-timer" key={`t${flowIdx}`} />}
          </div>
        </section>
        <section id="pipelines" className="ar-sec ar-rv" aria-labelledby="pipelines-h">
          <SectionHead id="pipelines" eyebrow="Eight pipelines" title="Pipeline explorer"
            sub="Filter by orchestrator, then pick a pipeline to see its sources, schedule and warehouse tables." />
          <div className="ar-filters" role="group" aria-label="Filter pipelines by orchestrator">
            {GROUPS.map((g) => (
              <button key={g.id} type="button" className={group === g.id ? 'on' : ''} onClick={() => setGroup(g.id)}>
                {g.label} <em>{counts[g.id] || 0}</em>
              </button>
            ))}
          </div>
          <div className="ar-pl">
            <div className="ar-pl-list" role="listbox" aria-label="Pipelines">
              {list.map((p) => (
                <button key={p.id} type="button" role="option" aria-selected={sel?.id === p.id} style={{ '--c': p.color }}
                  className={`ar-pl-item${sel?.id === p.id ? ' on' : ''}`} onClick={() => setOpenId(p.id)}>
                  <span className="ar-pl-ic"><p.Icon size={17} /></span>
                  <span className="ar-pl-t"><b>{p.title}</b><small>{p.schedule}</small></span>
                </button>
              ))}
            </div>
            {sel && (
              <article className="ar-pl-detail" key={sel.id} style={{ '--c': sel.color }}>
                <div className="ar-pl-head">
                  <span className="ar-panel-ic"><sel.Icon size={22} /></span>
                  <div><h3>{sel.title}</h3><p>{sel.tagline}</p></div>
                </div>
                <div className="ar-badges">
                  <span><Sparkles size={12} /> {sel.orchestrator}</span>
                  <span><Clock size={12} /> {sel.schedule}</span>
                </div>
                <div className="ar-block">
                  <h4><Database size={13} /> Sources <em>{sel.sources.length}</em></h4>
                  {sel.sources.map((s) => (
                    <div key={s.name} className="ar-src"><strong>{s.name}</strong><span>{s.detail}</span></div>
                  ))}
                </div>
                <div className="ar-block">
                  <h4><Table2 size={13} /> Warehouse tables <em>{sel.tables.length}</em></h4>
                  <div className="ar-tables">
                    {sel.tables.map((t) => <code key={t} className={t.startsWith('dim_') ? 'dim' : 'fact'}>{t}</code>)}
                  </div>
                </div>
                <div className="ar-note"><Sparkles size={14} /> <span>{sel.note}</span></div>
              </article>
            )}
          </div>
        </section>

        <section id="models" className="ar-sec ar-rv" aria-labelledby="models-h">
          <SectionHead id="models" eyebrow="Analytics layer" title="15+ real, trained models"
            sub="Search or filter by what the model does." />
          <div className="ar-tools">
            <div className="ar-filters" role="group" aria-label="Filter models by type">
              {MODEL_CATS.map((c) => (
                <button key={c} type="button" className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c} <em>{catCount(c)}</em></button>
              ))}
            </div>
            <label className="ar-search">
              <Search size={15} />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models, e.g. k-means" aria-label="Search models" />
            </label>
          </div>
          <div className="ar-models">
            {models.map(([name, tech, desc, c]) => {
              const m = CAT_META[c]
              return (
                <div key={name} className="ar-model" style={{ '--c': m.color }}>
                  <span className="ar-model-ic"><m.icon size={17} /></span>
                  <div>
                    <b>{name}</b>
                    <p>{desc}</p>
                    <code>{tech}</code>
                    <em>{c}</em>
                  </div>
                </div>
              )
            })}
          </div>
          {models.length === 0 && (
            <div className="sx-empty"><SearchX size={26} /><p>No model matches "{query}".</p></div>
          )}
          <p className="ar-count" aria-live="polite">Showing {models.length} of {ML_MODELS.length}</p>
        </section>
        <section id="principles" className="ar-sec ar-rv" aria-labelledby="principles-h">
          <SectionHead id="principles" eyebrow="Why these choices" title="Design decisions and the bugs behind them"
            sub="Several of these came from real failures found by testing against live data." />
          <div className="ar-pr">
            {PRINCIPLES.map((p) => {
              const open = !!openP[p.title]
              return (
                <article key={p.title} className={`ar-pr-card${open ? ' open' : ''}`} style={{ '--c': p.color }}>
                  <span className="ar-pr-ic"><p.icon size={18} /></span>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                  <button type="button" onClick={() => setOpenP({ ...openP, [p.title]: !open })} aria-expanded={open}>
                    {open ? 'Show less' : 'Read more'} <ChevronDown size={13} />
                  </button>
                </article>
              )
            })}
          </div>
        </section>

        <section id="stack" className="ar-sec ar-rv" aria-labelledby="stack-h">
          <SectionHead id="stack" eyebrow="Everything in the box" title="Full tech stack" />
          <div className="ar-stack">
            {STACK.map((g) => (
              <div key={g.group} className="ar-stack-g" style={{ '--c': g.color }}>
                <h3><i /> {g.group} <em>{g.items.length}</em></h3>
                <div className="ar-chips">{g.items.map((t) => <span key={t}>{t}</span>)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="ar-cta ar-rv">
          <div>
            <h2>See it running</h2>
            <p>The dashboards on the home page are fed by exactly this pipeline. The code is open.</p>
          </div>
          <div className="ar-cta-btns">
            <Link to="/#explorer" className="cd-btn primary"><Layers size={15} /> Open the dashboards</Link>
            <a className="cd-btn" href={REPO_URL} target="_blank" rel="noopener noreferrer"><Github size={15} /> View the code <ArrowUpRight size={14} /></a>
          </div>
        </section>
      </main>
    </>
  )
}

export default ArchitecturePage
