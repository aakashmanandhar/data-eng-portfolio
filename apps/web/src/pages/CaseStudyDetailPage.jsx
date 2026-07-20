import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import '../App.css'

function CaseStudyDetailPage() {
  const { slug } = useParams()
  const [caseStudy, setCaseStudy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`http://localhost:8000/api/case-studies/${slug}/`)
      .then((res) => {
        if (!res.ok) throw new Error('Case study not found')
        return res.json()
      })
      .then((data) => {
        setCaseStudy(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [slug])

  if (loading) return <div className="detail-page"><p>Loading...</p></div>
  if (error) return <div className="detail-page"><p>Error: {error}</p></div>

  return (
    <div className="detail-page">
      <a href="/" className="back-link">← Back to portfolio</a>
      <h1>{caseStudy.title}</h1>
      <div className="pills">
        {caseStudy.tech_stack.split(',').map((tech) => (
          <span className="pill" key={tech}>{tech.trim()}</span>
        ))}
      </div>

      {caseStudy.pdf_document && (
        <a href={caseStudy.pdf_document} target="_blank" rel="noopener noreferrer" className="btn-primary pdf-link">
          ⬇ Download Full Case Study (PDF)
        </a>
      )}

      <div className="readme-content">
        <ReactMarkdown
          components={{
            img: ({ src, alt }) => (
              <a href={src} target="_blank" rel="noopener noreferrer">
                <img src={src} alt={alt} style={{ cursor: 'zoom-in' }} />
              </a>
            )
          }}
        >{caseStudy.readme_content}</ReactMarkdown>
      </div>
    </div>
  )
}

export default CaseStudyDetailPage