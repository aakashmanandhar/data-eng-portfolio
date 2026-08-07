import { useState, useEffect, useRef } from 'react'

export function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0)
  const startRef = useRef(null)

  useEffect(() => {
    if (target == null) return
    startRef.current = null
    let frame
    const step = (timestamp) => {
      if (startRef.current === null) startRef.current = timestamp
      const progress = Math.min((timestamp - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}