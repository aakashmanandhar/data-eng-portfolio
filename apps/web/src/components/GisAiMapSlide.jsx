import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// Rough country_code -> [lat, lng] centroid lookup for the countries we expect
const COUNTRY_COORDS = {
  CN: [35.86, 104.2], US: [37.09, -95.71], IN: [20.59, 78.96], DE: [51.17, 10.45],
  GB: [55.38, -3.44], BR: [-14.24, -51.93], FR: [46.23, 2.21], CA: [56.13, -106.35],
  JP: [36.20, 138.25], KR: [35.91, 127.77], RU: [61.52, 105.32], AU: [-25.27, 133.78],
  ES: [40.46, -3.75], NL: [52.13, 5.29], VN: [14.06, 108.28], SG: [1.35, 103.82],
  PL: [51.92, 19.15], ID: [-0.79, 113.92], IT: [41.87, 12.57], MX: [23.63, -102.55],
  UY: [-32.52, -55.77],
}

function createPieIcon(aiPct, radius) {
  const r = radius
  const size = r * 2
  const angle = aiPct * 360
  const largeArc = angle > 180 ? 1 : 0
  const rad = (angle * Math.PI) / 180
  const x = r + r * Math.sin(rad)
  const y = r - r * Math.cos(rad)

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${r}" cy="${r}" r="${r}" fill="#2563EB" stroke="white" stroke-width="1"/>
      <path d="M ${r} ${r} L ${r} 0 A ${r} ${r} 0 ${largeArc} 1 ${x} ${y} Z" fill="#8B5CF6" stroke="white" stroke-width="0.5"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [r, r],
  })
}

function GisAiMapSlide() {
  const [countryData, setCountryData] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/api/country-ai-signal/`)
      .then((res) => res.json())
      .then(setCountryData)
      .catch((err) => console.error('Failed to load country AI signal:', err))
  }, [])

  const maxStars = countryData.length > 0 ? Math.max(...countryData.map((d) => d.total_stargazers)) : 1

  return (
    <div className="gis-map-slide">
      <section className="explorer-section">
        <div className="eyebrow">🌐 AI Adoption Map · Where the Shift Is Happening</div>
        <div className="explorer-box">
          <MapContainer center={[20, 10]} zoom={2} minZoom={2} maxBounds={[[-90, -180], [90, 180]]}
                        style={{ height: '420px', width: '100%', borderRadius: '10px' }}
                        scrollWheelZoom={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />
            {countryData.map((d) => {
              const coords = COUNTRY_COORDS[d.country_code]
              if (!coords) return null
              const radius = 10 + (d.total_stargazers / maxStars) * 26
              return (
                <Marker key={d.country_code} position={coords} icon={createPieIcon(d.ai_share_pct, radius)}>
                  <Popup>
                    <strong>{d.country_code}</strong><br />
                    AI share: {(d.ai_share_pct * 100).toFixed(1)}%<br />
                    Total stars: {d.total_stargazers.toLocaleString()}
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
          <div className="explorer-note">
            🔧 Live data from GitHub via OSS Insight, refreshed daily via Apache Airflow. Bubble size = total tracked activity, color = AI-leaning (purple) vs. balanced (blue) vs. traditional-leaning (cyan).
          </div>
        </div>
      </section>
    </div>
  )
}

export default GisAiMapSlide