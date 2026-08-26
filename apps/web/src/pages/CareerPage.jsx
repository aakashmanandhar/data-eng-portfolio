import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import CareerAbout from '../components/CareerAbout'
import CareerTimeline, { CareerStats } from '../components/CareerTimeline'
import '../App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function CareerPage() {
  const [data, setData] = useState(null)

  return (
    <div className="detail-page">
      <div className="cv-page-top-row">
        <Link to="/" className="back-link">← Back to portfolio</Link>
        <a href={`${API_BASE}/api/cv-pdf/`} className="cv-download-btn" download>
          <Download size={14} />
          Download CV
        </a>
      </div>

      <CareerAbout profile={data?.profile} expertise={data?.expertise} achievements={data?.achievements} />
      <CareerStats data={data} />
      <CareerTimeline onDataLoaded={setData} />
    </div>
  )
}

export default CareerPage
