import { useState, useRef, useEffect } from 'react'

function Carousel({ slides, onSlideChange }) {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(null)
  const containerRef = useRef(null)
  const hasInteracted = useRef(false)

  const goTo = (index) => {
    if (index < 0 || index >= slides.length) return
    hasInteracted.current = true
    setCurrent(index)
    if (onSlideChange) onSlideChange(index)
  }

  useEffect(() => {
    if (hasInteracted.current && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [current])

  useEffect(() => {
    const jumpHandler = (e) => {
      const index = e.detail?.index
      if (typeof index === 'number') goTo(index)
    }
    window.addEventListener('carousel-jump', jumpHandler)
    return () => window.removeEventListener('carousel-jump', jumpHandler)
  }, [])

  const handleTouchStart = (e) => {
    if (e.target.closest('.leaflet-container')) {
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

  return (
    <div className="carousel" ref={containerRef}>
      <div
        className="carousel-track"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="carousel-slide" key={current}>
          {slides[current]}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            className="carousel-arrow carousel-arrow-left"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
          >
            ‹
          </button>
          <button
            className="carousel-arrow carousel-arrow-right"
            onClick={() => goTo(current + 1)}
            disabled={current === slides.length - 1}
          >
            ›
          </button>
          <div className="carousel-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot${i === current ? ' active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Carousel