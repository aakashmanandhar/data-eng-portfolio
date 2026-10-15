import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import {
  ArrowLeft, Download, Link2, Check, Copy, Clock, CalendarDays, ChevronLeft, ChevronRight,
  X, ListTree, Moon, Sun, Compass, Layers, Target, SearchX,
} from 'lucide-react'
import '../App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// README HTML is rendered, but sanitised: no scripts, no inline handlers.
const SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'align'],
    img: [...(defaultSchema.attributes?.img || []), 'width', 'height', 'align'],
    details: [...(defaultSchema.attributes?.details || []), 'open'],
  },
}
const REHYPE = [rehypeRaw, [rehypeSanitize, SCHEMA], rehypeSlug]
const REMARK = [remarkGfm]

const ZoomContext = createContext(() => {})

function textOf(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return textOf(node.props?.children)
}

function Pre({ children }) {
  const [ok, setOk] = useState(false)
  const lang = /language-([\w+-]+)/.exec(children?.props?.className || '')?.[1]
  const copy = async () => {
    try { await navigator.clipboard.writeText(textOf(children).replace(/\n$/, '')) } catch { /* blocked */ }
    setOk(true)
    setTimeout(() => setOk(false), 1600)
  }
  return (
    <div className="cd-code">
      <div className="cd-code-bar">
        <span>{lang || 'code'}</span>
        <button type="button" onClick={copy} aria-label="Copy code">
          {ok ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  )
}

function Img({ src, alt, width, height }) {
  const zoom = useContext(ZoomContext)
  return (
    <img
      src={src} alt={alt || ''} width={width} height={height} loading="lazy"
      onClick={(e) => {
        const el = e.currentTarget
        if (el.closest('a') || el.naturalWidth < 200) return
        zoom({ src, alt })
      }}
    />
  )
}

function Heading({ level, id, children }) {
  const Tag = `h${level}`
  return (
    <Tag id={id}>
      {id && <a className="cd-anchor" href={`#${id}`} aria-label="Link to this section">#</a>}
      {children}
    </Tag>
  )
}

const MD_COMPONENTS = {
  pre: Pre,
  img: Img,
  h2: (p) => <Heading level={2} {...p} />,
  h3: (p) => <Heading level={3} {...p} />,
  table: ({ children }) => <div className="cd-table"><table>{children}</table></div>,
  a: ({ href, children }) => {
    const external = /^https?:\/\//.test(href || '')
    return <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>
  },
}

const stripHtml = (s) => (s || '').replace(/<[^>]+>/g, ' ')
const fmtDate = (d) => {
  const x = d ? new Date(d) : null
  return x && !Number.isNaN(x.getTime()) ? x.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''
}

function CaseStudyDetailPage() {
  const { slug } = useParams()
  const [cs, setCs] = useState(null)
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [zoom, setZoom] = useState(null)
  const [toc, setToc] = useState([])
  const [active, setActive] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [copied, setCopied] = useState(false)
  const bar = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch { /* private mode */ }
  }, [theme])

  useEffect(() => {
    setLoading(true)
    setError(null)
    window.scrollTo(0, 0)
    fetch(`${API_BASE}/api/case-studies/${slug}/`)
      .then((res) => { if (!res.ok) throw new Error('Case study not found'); return res.json() })
      .then((data) => { setCs(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [slug])

  useEffect(() => {
    fetch(`${API_BASE}/api/case-studies/`).then((r) => r.json()).then((d) => setAll(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!cs) return undefined
    const prev = document.title
    document.title = `${cs.title} | Aakash Manandhar`
    return () => { document.title = prev }
  }, [cs])

  // outline ("On this page"), built from the rendered headings
  useEffect(() => {
    if (!cs || !bodyRef.current) return
    const hs = [...bodyRef.current.querySelectorAll('h2[id], h3[id]')]
    setToc(hs.map((h) => ({ id: h.id, text: h.textContent.replace(/^#/, ''), level: Number(h.tagName[1]) })))
    if (window.location.hash) {
      const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
      if (el) setTimeout(() => el.scrollIntoView(), 50)
    }
  }, [cs])

  // reading progress, header state, active section
  useEffect(() => {
    let tick = false
    const run = () => {
      tick = false
      const el = bodyRef.current
      const y = window.scrollY
      setScrolled(y > 220)
      if (el && bar.current) {
        const top = el.offsetTop
        const p = Math.max(0, Math.min(1, (y - top + 200) / Math.max(1, el.offsetHeight - 200)))
        bar.current.style.transform = `scaleX(${p})`
      }
      let cur = ''
      document.querySelectorAll('.cd-body h2[id], .cd-body h3[id]').forEach((h) => {
        if (h.getBoundingClientRect().top <= 120) cur = h.id
      })
      setActive(cur)
    }
    const onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(run) } }
    run()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [cs])

  useEffect(() => {
    if (!zoom) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setZoom(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  const minutes = useMemo(() => {
    const words = stripHtml(cs?.readme_content).split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / 220))
  }, [cs])

  const idx = all.findIndex((x) => x.slug === slug)
  const prev = idx > 0 ? all[idx - 1] : null
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href.split('#')[0]) } catch { /* blocked */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const Bar = (
    <div className={`cd-bar${scrolled ? ' scrolled' : ''}`}>
      <div className="cd-bar-in">
        <a href="/#projects" className="cd-back"><ArrowLeft size={15} /> <span>Portfolio</span></a>
        <span className="cd-bar-title">{cs?.title}</span>
        <div className="cd-bar-actions">
          {cs?.pdf_document && (
            <a className="cd-btn sm primary" href={cs.pdf_document} target="_blank" rel="noopener noreferrer" aria-label="Download case study as PDF">
              <Download size={14} /> <span>PDF</span>
            </a>
          )}
          <button type="button" className="cd-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </div>
      <div className="cd-progress" aria-hidden="true"><i ref={bar} /></div>
    </div>
  )

  if (loading) {
    return (
      <>
        {Bar}
        <div className="cd-page">
          <i className="skel-box" style={{ height: 38, width: '70%' }} />
          <i className="skel-box" style={{ height: 18, width: '90%', marginTop: 14 }} />
          <i className="skel-box" style={{ height: 120, marginTop: 24 }} />
          <i className="skel-box" style={{ height: 260, marginTop: 14 }} />
        </div>
      </>
    )
  }
  if (error || !cs) {
    return (
      <>
        {Bar}
        <div className="cd-page">
          <div className="sx-empty">
            <SearchX size={28} />
            <p>{error || 'Case study not found'}</p>
            <Link to="/">Back to portfolio</Link>
          </div>
        </div>
      </>
    )
  }

  const techs = (cs.tech_stack || '').split(',').map((s) => s.trim()).filter(Boolean)
  const glance = [
    { icon: Target, label: 'The problem', text: cs.problem },
    { icon: Layers, label: 'The architecture', text: cs.architecture },
    { icon: Compass, label: 'The outcome', text: cs.outcome },
  ].filter((g) => (g.text || '').trim())

  return (
    <ZoomContext.Provider value={setZoom}>
      {Bar}
      <div className="cd-page">
        <header className="cd-hero">
          <div className="cd-eyebrow">Case study{cs.is_featured ? ' · Featured' : ''}</div>
          <h1>{cs.title}</h1>
          {cs.summary && <p className="cd-lead">{cs.summary}</p>}
          <div className="cd-meta">
            <span><Clock size={14} /> {minutes} min read</span>
            {fmtDate(cs.updated_at) && <span><CalendarDays size={14} /> Updated {fmtDate(cs.updated_at)}</span>}
          </div>
          <div className="cd-pills">
            {techs.map((t) => <span className="cd-pill" key={t}>{t}</span>)}
          </div>
          <div className="cd-actions">
            {cs.pdf_document && (
              <a className="cd-btn primary" href={cs.pdf_document} target="_blank" rel="noopener noreferrer">
                <Download size={15} /> Download PDF
              </a>
            )}
            <button type="button" className="cd-btn" onClick={copyLink}>
              {copied ? <><Check size={15} /> Link copied</> : <><Link2 size={15} /> Copy link</>}
            </button>
          </div>
        </header>

        {glance.length > 0 && (
          <section className="cd-glance" aria-label="At a glance">
            {glance.map((g) => {
              const Icon = g.icon
              return (
                <div className="cd-glance-card" key={g.label}>
                  <h2><Icon size={15} /> {g.label}</h2>
                  <p>{g.text}</p>
                </div>
              )
            })}
          </section>
        )}

        <div className="cd-layout">
          <article className="cd-body" ref={bodyRef}>
            {toc.length > 2 && (
              <details className="cd-toc-m">
                <summary><ListTree size={15} /> On this page</summary>
                <ul>
                  {toc.map((h) => <li key={h.id} className={`l${h.level}`}><a href={`#${h.id}`}>{h.text}</a></li>)}
                </ul>
              </details>
            )}
            <ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE} components={MD_COMPONENTS}>
              {cs.readme_content || ''}
            </ReactMarkdown>
          </article>

          {toc.length > 2 && (
            <aside className="cd-toc" aria-label="On this page">
              <div className="cd-toc-title"><ListTree size={14} /> On this page</div>
              <ul>
                {toc.map((h) => (
                  <li key={h.id} className={`l${h.level}${active === h.id ? ' on' : ''}`}>
                    <a href={`#${h.id}`}>{h.text}</a>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

        {(prev || next) && (
          <nav className="cd-pn" aria-label="More case studies">
            {prev ? (
              <Link to={`/case-studies/${prev.slug}`} className="cd-pn-card">
                <span><ChevronLeft size={14} /> Previous</span>
                <strong>{prev.title}</strong>
              </Link>
            ) : <i />}
            {next ? (
              <Link to={`/case-studies/${next.slug}`} className="cd-pn-card right">
                <span>Next <ChevronRight size={14} /></span>
                <strong>{next.title}</strong>
              </Link>
            ) : <i />}
          </nav>
        )}
      </div>

      {zoom && (
        <div className="cd-zoom" role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setZoom(null)}>
          <button type="button" className="cd-zoom-x" onClick={() => setZoom(null)} aria-label="Close image"><X size={18} /></button>
          <img src={zoom.src} alt={zoom.alt || ''} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </ZoomContext.Provider>
  )
}

export default CaseStudyDetailPage
