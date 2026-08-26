import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CaseStudyDetailPage from './pages/CaseStudyDetailPage'
import ArchitecturePage from './pages/ArchitecturePage'
import CareerPage from './pages/CareerPage'
import ChatWidget from './components/ChatWidget'
import VisitorWidget from './components/VisitorWidget'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/case-studies/:slug" element={<CaseStudyDetailPage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/career" element={<CareerPage />} />
      </Routes>
      <ChatWidget />
      <VisitorWidget />
    </BrowserRouter>
  )
}
export default App