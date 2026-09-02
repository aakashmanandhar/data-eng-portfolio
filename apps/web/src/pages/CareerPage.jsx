import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Loader2 } from 'lucide-react'
import CareerAbout from '../components/CareerAbout'
import CareerTimeline, { CareerStats } from '../components/CareerTimeline'
import '../App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function CareerPage() {
  const [data, setData] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const res = await fetch(`${API_BASE}/api/cv-pdf/`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '01_Aakash_Data_Engineer.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CV download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="detail-page">
      <div className="cv-page-top-row">
        <Link to="/" className="back-link">← Back to portfolio</Link>
        <button
          className="cv-download-btn"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 size={14} className="cv-download-spinner" />
          ) : (
            <Download size={14} />
          )}
          {downloading ? 'Preparing...' : 'Download CV'}
        </button>
      </div>

      <CareerAbout profile={data?.profile} expertise={data?.expertise} achievements={data?.achievements} />
      <CareerStats data={data} />
      <CareerTimeline onDataLoaded={setData} />
    </div>
  )
}

export default CareerPage
