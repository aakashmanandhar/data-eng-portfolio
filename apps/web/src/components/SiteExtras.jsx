import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

// [nav href, element to watch]
const SPY = [
  ['#projects', '#projects'],
  ['#explorer', '.carousel'],
  ['#adrs', '#adrs'],
  ['#about', '#about'],
  ['#contact', '#contact'],
]
const REVEAL = '.analytics-header, .carousel, .case-studies-section, .adr-section, .about-section, .contact-section'

/** Scroll progress bar, nav scroll-spy, back-to-top button and scroll-reveal, in one place. */
export default function SiteExtras() {
  const bar = useRef(null)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let ticking = false
    let lastActive = null
    const update = () => {
      ticking = false
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
      setShowTop(window.scrollY > 700)

      // scroll-spy: the last section whose top has passed 35% of the viewport
      let active = null
      for (const [href, sel] of SPY) {
        const el = document.querySelector(sel)
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.35) active = href
      }
      if (active !== lastActive) {
        lastActive = active
        document.querySelectorAll('.nav-links a[href^="#"]').forEach((a) => {
          const on = a.getAttribute('href') === active
          a.classList.toggle('nav-active', on)
          if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current')
        })
      }
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  // scroll-reveal: add the class once, reveal when it enters the viewport
  useEffect(() => {
    const els = [...document.querySelectorAll(REVEAL)]
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) } })
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' })
    els.forEach((el) => { el.classList.add('rv'); io.observe(el) })
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className="scroll-progress" aria-hidden="true"><i ref={bar} /></div>
      <button
        type="button"
        className={`to-top${showTop ? ' show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
      >
        <ArrowUp size={18} />
      </button>
    </>
  )
}

function useCountUp(target, run) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return undefined }
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 1100)
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run])
  return v
}

function Stat({ to, suffix = '', label, run }) {
  const v = useCountUp(to, run)
  return (
    <div className="hs">
      <b>{v.toLocaleString()}{suffix}</b>
      <span>{label}</span>
    </div>
  )
}

/** Four proof-point numbers that count up when scrolled into view. */
export function HeroStats() {
  const ref = useRef(null)
  const [run, setRun] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setRun(true); return undefined }
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setRun(true); io.disconnect() } }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div className="hero-stats" ref={ref}>
      <Stat to={8} label="live pipelines" run={run} />
      <Stat to={13} suffix="+" label="ML models" run={run} />
      <Stat to={151} suffix="K+" label="survey respondents" run={run} />
      <Stat to={122} label="repos tracked" run={run} />
    </div>
  )
}

/** Shimmering placeholder shown while a slide loads its first data. */
export function SlideSkeleton({ label = 'Loading…' }) {
  return (
    <div className="skel" role="status" aria-label={label}>
      <div className="skel-row">
        {[0, 1, 2, 3].map((i) => <i key={i} className="skel-box h64" />)}
      </div>
      <div className="skel-row two">
        <i className="skel-box h220" />
        <i className="skel-box h220" />
      </div>
      <span className="skel-label">{label}</span>
    </div>
  )
}
