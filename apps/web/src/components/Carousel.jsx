import { useState, useRef, useEffect } from 'react'
import { Link2, Check } from 'lucide-react'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

function Carousel({ slides, labels = [], onSlideChange }) {
  const [current, setCurrent] = useState(0)
  const [copied, setCopied] = useState(false)
  const touchStartX = useRef(null)
  const containerRef = useRef(null)
  const hasInteracted = useRef(false)
  const currentRef = useRef(0)
  currentRef.current = current

  const goTo = (index, { fromHash = false } = {}) => {
    if (index < 0 || index >= slides.length) return
    hasInteracted.current = true
    setCurrent(index)
    if (onSlideChange) onSlideChange(index)
    if (!fromHash && labels[index]) {
      try { window.history.replaceState(null, '', `#slide=${slug(labels[index])}`) } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    if (hasInteracted.current && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [current])

  // deep link: #slide=ai-adoption opens that slide (on load and when the hash changes)
  useEffect(() => {
    const open = () => {
      const m = /^#slide=([a-z0-9-]+)$/.exec(window.location.hash)
      if (!m) return
      const i = labels.findIndex((l) => slug(l) === m[1])
      if (i >= 0 && i !== currentRef.current) goTo(i, { fromHash: true })
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const jumpHandler = (e) => {
      const index = e.detail?.index
      if (typeof index === 'number') goTo(index)
    }
    window.addEventListener('carousel-jump', jumpHandler)
    return () => window.removeEventListener('carousel-jump', jumpHandler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // arrow keys switch slides while the carousel is on screen (never while typing or inside a dialog / globe)
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const t = e.target
      if (t && (t.closest?.('input, textarea, select, [contenteditable="true"], .gx-globe-wrap') || t.isContentEditable)) return
      if (document.querySelector('[role="dialog"]')) return
      const el = containerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.bottom < 80 || r.top > window.innerHeight - 80) return
      goTo(currentRef.current + (e.key === 'ArrowRight' ? 1 : -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTouchStart = (e) => {
    if (e.target.closest('.leaflet-container, .gx-globe-wrap, .gx-tabs')) {
      touchStartX.current = null
      return
    }
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX > 50) goTo(current - 1)
    else if (deltaX < -50) goTo(current + 1)
    touchStartX.current = null
  }

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#slide=${slug(labels[current] || '')}`
    try { await navigator.clipboard.writeText(url) } catch { /* clipboard blocked */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="carousel" ref={containerRef} role="region" aria-roledescription="carousel" aria-label="Live analytics">
      <div className="carousel-track" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="carousel-slide" key={current} aria-live="polite">
          {slides[current]}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button className="carousel-arrow carousel-arrow-left" onClick={() => goTo(current - 1)}
            disabled={current === 0} aria-label="Previous slide">‹</button>
          <button className="carousel-arrow carousel-arrow-right" onClick={() => goTo(current + 1)}
            disabled={current === slides.length - 1} aria-label="Next slide">›</button>
          <div className="carousel-dots">
            {slides.map((_, i) => (
              <button key={i} className={`carousel-dot${i === current ? ' active' : ''}`} onClick={() => goTo(i)}
                aria-label={labels[i] ? `Go to ${labels[i]}` : `Go to slide ${i + 1}`} title={labels[i] || ''}
                aria-current={i === current ? 'true' : undefined} />
            ))}
          </div>
          {labels[current] && (
            <div className="carousel-caption">
              <span>{current + 1} / {slides.length} · <b>{labels[current]}</b></span>
              <button type="button" onClick={copyLink} aria-label="Copy link to this slide">
                {copied ? <><Check size={13} /> Link copied</> : <><Link2 size={13} /> Copy link</>}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Carousel
