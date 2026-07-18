import { useParams } from 'react-router-dom'

function CaseStudyDetailPage() {
  const { slug } = useParams()
  return <div style={{ padding: '40px' }}>Detail page placeholder — slug is: {slug}</div>
}

export default CaseStudyDetailPage