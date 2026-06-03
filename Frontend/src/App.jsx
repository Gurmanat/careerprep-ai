import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ResumeBuilder from './pages/ResumeBuilder'
import InterviewCoach from './pages/InterviewCoach'
import Navbar from './components/Navbar'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resume" element={<ResumeBuilder />} />
        <Route path="/interview" element={<InterviewCoach />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App