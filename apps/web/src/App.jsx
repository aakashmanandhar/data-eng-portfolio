import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CaseStudyDetailPage from './pages/CaseStudyDetailPage'
import ArchitecturePage from './pages/ArchitecturePage'
import ChatWidget from './components/ChatWidget'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/case-studies/:slug" element={<CaseStudyDetailPage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
      </Routes>
      <ChatWidget />
    </BrowserRouter>
  )
}
export default App