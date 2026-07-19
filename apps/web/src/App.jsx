import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CaseStudyDetailPage from './pages/CaseStudyDetailPage'
import ChatWidget from './components/ChatWidget'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/case-studies/:slug" element={<CaseStudyDetailPage />} />
      </Routes>
      <ChatWidget />
    </BrowserRouter>
  )
}

export default App