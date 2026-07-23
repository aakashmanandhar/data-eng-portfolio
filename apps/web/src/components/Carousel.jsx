import { useState, useRef, useEffect } from 'react'

function Carousel({ slides }) {
  const [current, setCurrent] = useState(0)
  const [height, setHeight] = useState('auto')
  const touchStartX = useRef(null)
  const slideRefs = useRef([])

  const goTo = (index) => {
    if (index < 0 || index >= slides.length) return
    setCurrent(index)
  }

  useEffect(() => {
    const activeSlide = slideRefs.current[current]
    if (activeSlide) {
      setHeight(activeSlide.offsetHeight)
    }
  }, [current, slides])

  useEffect(() => {
    const jumpHandler = (e) => {
      const index = e.detail?.index
      if (typeof index === 'number') goTo(index)
    }
    window.addEventListener('carousel-jump', jumpHandler)
    return () => window.removeEventListener('carousel-jump', jumpHandler)
  }, [])

  const handleTouchStart = (e) => {
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
    <div className="carousel">
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${current * 100}%)`, height }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, i) => (
          <div className="carousel-slide" key={i} ref={(el) => (slideRefs.current[i] = el)}>
            {slide}
          </div>
        ))}
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