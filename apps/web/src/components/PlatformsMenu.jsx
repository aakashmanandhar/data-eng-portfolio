import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ArrowUpRight, Layers, Database, Cpu, Brain, BarChart3, Workflow, Cloud, Globe2, Rocket } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const ICONS = {
  layers: Layers, database: Database, cpu: Cpu, brain: Brain, chart: BarChart3,
  workflow: Workflow, cloud: Cloud, globe: Globe2, rocket: Rocket,
}

function PlatformIcon({ p, Fallback }) {
  const [failed, setFailed] = useState(false)
  const base = (p.url || '').replace(/\/+$/, '')
  const src = p.icon_url || (base ? `${base}/favicon.svg?v=${Math.floor(Date.now() / 3600000)}` : '')
  if (!src || failed) return <span className="platforms-item-icon"><Fallback size={18} /></span>
  return (
    <span className="platforms-item-icon has-logo">
      <img src={src} alt="" width="34" height="34" loading="lazy" onError={() => setFailed(true)} />
    </span>
  )
}

function PlatformsMenu() {
  const [platforms, setPlatforms] = useState([])
  const [open, setOpen] = useState(false)
  const [mobileTop, setMobileTop] = useState(null)
  const wrapRef = useRef(null)
  const closeTimer = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/platforms/`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => setPlatforms(Array.isArray(d) ? d : []))
      .catch(() => setPlatforms([]))
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    const onScroll = () => { if (window.innerWidth <= 600) setOpen(false) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (platforms.length === 0) return null

  const canHover = () =>
    typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(hover: hover) and (min-width: 851px)').matches

  const handleEnter = () => {
    if (!canHover()) return
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const handleLeave = () => {
    if (!canHover()) return
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }
  const handleToggle = () => {
    if (!open && window.innerWidth <= 600) {
      const nav = wrapRef.current?.closest('.nav')
      setMobileTop(nav ? Math.round(nav.getBoundingClientRect().bottom + 8) : 120)
    }
    setOpen(o => !o)
  }
  const focusItem = (dir) => {
    const items = wrapRef.current ? wrapRef.current.querySelectorAll('[role="menuitem"]') : []
    if (!items.length) return
    const i = Array.prototype.indexOf.call(items, document.activeElement)
    const next = i === -1 ? (dir > 0 ? 0 : items.length - 1) : (i + dir + items.length) % items.length
    items[next].focus()
  }
  const handleKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    if (!open) {
      setOpen(true)
      setTimeout(() => focusItem(1), 0)
      return
    }
    focusItem(e.key === 'ArrowDown' ? 1 : -1)
  }

  return (
    <div className="platforms-menu" ref={wrapRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`platforms-trigger ${open ? 'platforms-trigger-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggle}
      >
        <span className="platforms-pulse" />
        Platforms
        <span className="platforms-count">{platforms.length}</span>
        <ChevronDown size={13} className="platforms-chevron" />
      </button>

      {open && (
        <div className={`platforms-panel ${platforms.length > 5 ? 'platforms-panel-wide' : ''}`} role="menu" style={mobileTop !== null ? { '--platforms-top': `${mobileTop}px` } : undefined}>
          <div className="platforms-panel-head">
            <div>
              <span className="platforms-panel-title">Data &amp; AI platforms</span>
              <span className="platforms-panel-sub">Open any to explore it</span>
            </div>
            <span className="platforms-panel-count">{platforms.length} {platforms.length === 1 ? 'platform' : 'platforms'}</span>
          </div>
          <div className="platforms-list">
          {platforms.map((p, idx) => {
            const Icon = ICONS[p.icon] || Layers
            return (
              <a
                key={p.id}
                style={{ '--i': idx }}
                href={p.url}
                role="menuitem"
                className="platforms-item"
                target={p.open_in_new_tab ? '_blank' : undefined}
                rel={p.open_in_new_tab ? 'noopener noreferrer' : undefined}
              >
                <PlatformIcon p={p} Fallback={Icon} />
                <span className="platforms-item-text">
                  <span className="platforms-item-name">
                    {p.name}
                    {p.badge && <span className="platforms-item-badge">{p.badge}</span>}
                  </span>
                  <span className="platforms-item-tagline" title={p.tagline}>{p.tagline}</span>
                </span>
                <ArrowUpRight size={15} className="platforms-item-arrow" />
              </a>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}

export default PlatformsMenu
