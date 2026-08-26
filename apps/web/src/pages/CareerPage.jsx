import { useState } from 'react'
import { Link } from 'react-router-dom'
import CareerAbout from '../components/CareerAbout'
import CareerTimeline, { CareerStats } from '../components/CareerTimeline'
import '../App.css'

function CareerPage() {
  const [data, setData] = useState(null)

  return (
    <div className="detail-page">
      <Link to="/" className="back-link">← Back to portfolio</Link>

      <CareerAbout profile={data?.profile} expertise={data?.expertise} achievements={data?.achievements} />

      <CareerStats data={data} />
      <CareerTimeline onDataLoaded={setData} />
    </div>
  )
}

export default CareerPage
