import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function VisitorWidget() {
  const [count, setCount] = useState(null)
  const [stats, setStats] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let sessionId = sessionStorage.getItem('visitor_session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('visitor_session_id', sessionId)
    }

    const sendHeartbeat = () => {
      fetch(`${API_BASE}/api/visitor-heartbeat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      }).catch(() => {})
    }

    const fetchCount = () => {
      fetch(`${API_BASE}/api/visitor-count/`)
        .then((res) => res.json())
        .then((data) => setCount(data.active_visitors))
        .catch(() => {})
    }

    sendHeartbeat()
    fetchCount()
    const heartbeatInterval = setInterval(sendHeartbeat, 15000)
    const countInterval = setInterval(fetchCount, 15000)

    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(countInterval)
    }
  }, [])

  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next && !stats) {
      fetch(`${API_BASE}/api/visitor-stats/`)
        .then((res) => res.json())
        .then(setStats)
        .catch(() => {})
    }
  }

  if (count === null) return null

  return (
    <div className="visitor-widget-wrap">
      {open && (
        <div className="visitor-panel">
          <div className="visitor-panel-title">📈 Site Visitors</div>
          {stats ? (
            <div className="visitor-stats-grid">
              <div className="visitor-stat">
                <div className="visitor-stat-value">{stats.today}</div>
                <div className="visitor-stat-label">Today</div>
              </div>
              <div className="visitor-stat">
                <div className="visitor-stat-value">{stats.this_week}</div>
                <div className="visitor-stat-label">This Week</div>
              </div>
              <div className="visitor-stat">
                <div className="visitor-stat-value">{stats.this_month}</div>
                <div className="visitor-stat-label">This Month</div>
              </div>
            </div>
          ) : (
            <div className="visitor-stat-loading">Loading…</div>
          )}
        </div>
      )}
      <button className="visitor-widget" onClick={toggleOpen}>
        <span className="visitor-dot"></span>
        <span className="visitor-icon">👁️</span>
        <span className="visitor-count">{count}</span>
        <span className="visitor-label">{count === 1 ? 'visitor' : 'visitors'} online</span>
        <span className="visitor-chevron">{open ? '▾' : '▸'}</span>
      </button>
    </div>
  )
}

export default VisitorWidget