import { useEffect, useLayoutEffect, useMemo, useRef, useState, useId } from 'react'
import { geoOrthographic, geoPath, geoGraticule10, geoCentroid, geoArea } from 'd3-geo'
import { Plus, Minus, Pause, Play, LocateFixed } from 'lucide-react'

const SPHERE = { type: 'Sphere' }
const GRATICULE = geoGraticule10()
const HOME = [-12, -28] // [rotation lambda, rotation phi]: starts centred on Europe / Africa
const MIN_ZOOM = 1
const MAX_ZOOM = 2.4

// d3-geo wants exterior rings wound clockwise. If a polygon comes out
// "inside-out" (area larger than a hemisphere) we flip its rings once, here.
export function prepareFeatures(geo) {
  if (!geo || !geo.features) return []
  const flip = (rings) => rings.map((ring) => [...ring].reverse())
  return geo.features
    .filter((f) => f.geometry && f.id !== 'ATA')
    .map((f) => {
      if (geoArea(f) <= 2 * Math.PI) return f
      const g = f.geometry
      const coordinates = g.type === 'Polygon' ? flip(g.coordinates) : g.coordinates.map(flip)
      return { ...f, geometry: { ...g, coordinates } }
    })
}

/**
 * Interactive orthographic globe (SVG + d3-geo).
 *  features  prepared GeoJSON features (see prepareFeatures)
 *  fills     { [featureId]: cssColor } for countries that have data
 *  activeId  feature id to outline as "selected"
 *  focus     { id, n } -> when it changes, the globe turns to that country
 *  tooltip   (feature) => ReactNode | null, shown on hover
 *  onPick    (feature) => void, fired on click / tap
 */
export default function Globe({ features, fills, activeId, focus, tooltip, onPick, label = 'Interactive globe' }) {
  const uid = useId().replace(/:/g, '')
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const els = useRef({ countries: {} })
  const proj = useRef(geoOrthographic().clipAngle(90).precision(0.6))
  const rot = useRef([...HOME])
  const zoomRef = useRef(1)
  const size = useRef({ w: 420, h: 420 })
  const dirty = useRef(true)
  const drag = useRef(null)
  const anim = useRef(null)
  const hovering = useRef(false)
  const visible = useRef(true)
  const featuresRef = useRef([])
  const activeRef = useRef(null)
  const onPickRef = useRef(onPick)
  const [spin, setSpin] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [hover, setHover] = useState(null)
  const spinRef = useRef(true)

  onPickRef.current = onPick
  spinRef.current = spin

  const draw = () => {
    const { w, h } = size.current
    const r = Math.max(20, Math.min(w, h) / 2 - 8)
    const R = r * zoomRef.current
    const p = proj.current.translate([w / 2, h / 2]).scale(R).rotate(rot.current)
    const path = geoPath(p)
    const e = els.current
    const sphere = path(SPHERE) || ''
    e.sphere?.setAttribute('d', sphere)
    e.shade?.setAttribute('d', sphere)
    e.rim?.setAttribute('d', sphere)
    e.grat?.setAttribute('d', path(GRATICULE) || '')
    if (e.glow) {
      e.glow.setAttribute('cx', w / 2)
      e.glow.setAttribute('cy', h / 2)
      e.glow.setAttribute('r', R * 1.14)
    }
    for (const f of featuresRef.current) {
      const el = e.countries[f.id]
      if (el) el.setAttribute('d', path(f) || '')
    }
    const a = activeRef.current
    e.outline?.setAttribute('d', a ? path(a) || '' : '')
    dirty.current = false
  }

  // size tracking
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined
    const measure = () => {
      size.current = { w: wrap.clientWidth || 420, h: wrap.clientHeight || 420 }
      dirty.current = true
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    const io = new IntersectionObserver(([en]) => { visible.current = en.isIntersecting }, { threshold: 0.05 })
    io.observe(wrap)
    return () => { ro.disconnect(); io.disconnect() }
  }, [])

  // (re)draw after the country elements change
  useLayoutEffect(() => {
    featuresRef.current = features
    draw()
  }, [features]) // eslint-disable-line react-hooks/exhaustive-deps

  // pause the auto-rotation while a country is selected (the user can press play again)
  useEffect(() => { if (activeId) setSpin(false) }, [activeId])

  // selected-country outline
  useLayoutEffect(() => {
    activeRef.current = features.find((f) => f.id === activeId) || null
    dirty.current = true
  }, [activeId, features])

  // animation / auto-rotate loop
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(64, now - last)
      last = now
      if (visible.current && !document.hidden) {
        const a = anim.current
        if (a) {
          const t = Math.min(1, (now - a.t0) / a.dur)
          const k = 1 - Math.pow(1 - t, 3)
          rot.current = [a.from[0] + a.dl * k, a.from[1] + (a.to[1] - a.from[1]) * k]
          dirty.current = true
          if (t >= 1) anim.current = null
        } else if (spinRef.current && !hovering.current && !drag.current && !reduce) {
          rot.current = [rot.current[0] + dt * 0.006, rot.current[1]]
          dirty.current = true
        }
        if (dirty.current) draw()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const flyTo = (to, dur = 900) => {
    const from = rot.current
    const dl = ((to[0] - from[0] + 540) % 360) - 180
    anim.current = { from: [...from], to, dl, t0: performance.now(), dur }
  }

  // turn to a country when asked
  useEffect(() => {
    if (!focus) return
    const f = features.find((x) => x.id === focus.id)
    if (!f) return
    const [lon, lat] = geoCentroid(f)
    flyTo([-lon, Math.max(-60, Math.min(60, -lat))])
  }, [focus]) // eslint-disable-line react-hooks/exhaustive-deps

  const changeZoom = (z) => {
    const v = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
    zoomRef.current = v
    setZoom(v)
    dirty.current = true
  }

  const reset = () => { changeZoom(1); flyTo([...HOME]) }

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, r0: [...rot.current], moved: false }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (d) {
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.moved && Math.hypot(dx, dy) > 5) {
        d.moved = true
        anim.current = null
        setHover(null)
        try { svgRef.current.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
      }
      if (d.moved) {
        const k = 0.28 / zoomRef.current
        rot.current = [d.r0[0] + dx * k, Math.max(-80, Math.min(80, d.r0[1] - dy * k))]
        dirty.current = true
      }
      return
    }
    if (hover && wrapRef.current) {
      const b = wrapRef.current.getBoundingClientRect()
      setHover((h) => (h ? { ...h, x: e.clientX - b.left, y: e.clientY - b.top } : h))
    }
  }
  const endDrag = () => { drag.current = null }

  const onKeyDown = (e) => {
    const step = 10
    if (e.key === 'ArrowLeft') rot.current = [rot.current[0] + step, rot.current[1]]
    else if (e.key === 'ArrowRight') rot.current = [rot.current[0] - step, rot.current[1]]
    else if (e.key === 'ArrowUp') rot.current = [rot.current[0], Math.min(80, rot.current[1] + step)]
    else if (e.key === 'ArrowDown') rot.current = [rot.current[0], Math.max(-80, rot.current[1] - step)]
    else if (e.key === '+' || e.key === '=') changeZoom(zoomRef.current + 0.25)
    else if (e.key === '-') changeZoom(zoomRef.current - 0.25)
    else return
    e.preventDefault()
    anim.current = null
    dirty.current = true
  }

  const countryPaths = useMemo(() => features.map((f) => (
    <path
      key={f.id}
      ref={(el) => { if (el) els.current.countries[f.id] = el; else delete els.current.countries[f.id] }}
      className={`gx-c${fills[f.id] ? ' has-data' : ''}`}
      style={fills[f.id] ? { fill: fills[f.id] } : undefined}
      onClick={() => onPickRef.current?.(f)}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse' || drag.current?.moved) return
        const b = wrapRef.current.getBoundingClientRect()
        setHover({ f, x: e.clientX - b.left, y: e.clientY - b.top })
      }}
      onPointerLeave={() => setHover(null)}
    />
  )), [features, fills])

  const tip = hover && tooltip ? tooltip(hover.f) : null
  const { w: W } = size.current

  return (
    <div
      className="gx-globe-wrap"
      ref={wrapRef}
      tabIndex={0}
      role="group"
      aria-label={`${label}. Drag to rotate, use plus and minus to zoom.`}
      onKeyDown={onKeyDown}
      onPointerEnter={() => { hovering.current = true }}
      onPointerLeave={() => { hovering.current = false; setHover(null) }}
    >
      <svg
        className="gx-svg"
        ref={svgRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <radialGradient id={`${uid}-ocean`} cx="38%" cy="32%" r="80%">
            <stop offset="0%" style={{ stopColor: 'var(--gx-ocean-1)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--gx-ocean-2)' }} />
          </radialGradient>
          <radialGradient id={`${uid}-shade`} cx="40%" cy="35%" r="75%">
            <stop offset="60%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
          </radialGradient>
          <radialGradient id={`${uid}-glow`}>
            <stop offset="80%" style={{ stopColor: 'var(--gx-glow)' }} stopOpacity="0.42" />
            <stop offset="100%" style={{ stopColor: 'var(--gx-glow)' }} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle ref={(el) => { els.current.glow = el }} fill={`url(#${uid}-glow)`} pointerEvents="none" />
        <path ref={(el) => { els.current.sphere = el }} fill={`url(#${uid}-ocean)`} />
        <path ref={(el) => { els.current.grat = el }} className="gx-grat" />
        <g>{countryPaths}</g>
        <path ref={(el) => { els.current.outline = el }} className="gx-outline" />
        <path ref={(el) => { els.current.shade = el }} fill={`url(#${uid}-shade)`} pointerEvents="none" />
        <path ref={(el) => { els.current.rim = el }} className="gx-rim" />
      </svg>

      <div className="gx-ctrls">
        <button type="button" onClick={() => changeZoom(zoom + 0.3)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in"><Plus size={15} /></button>
        <button type="button" onClick={() => changeZoom(zoom - 0.3)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out"><Minus size={15} /></button>
        <button type="button" onClick={() => setSpin((s) => !s)} aria-label={spin ? 'Pause auto-rotation' : 'Resume auto-rotation'}>
          {spin ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button type="button" onClick={reset} aria-label="Reset view"><LocateFixed size={14} /></button>
      </div>

      {tip && (
        <div className={`gx-tip${hover.x > W * 0.55 ? ' flip' : ''}`} style={{ left: hover.x, top: hover.y }}>
          {tip}
        </div>
      )}
    </div>
  )
}
