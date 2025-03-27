import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import ViewRSO from './pages/ViewRSO'
import ViewEvent from './pages/ViewEvent'
import Universities from './pages/Universities'
import SuperAdmin from './pages/SuperAdmin'
import Events from './pages/Events'
import RSOs from './pages/RSOs'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Universities />} />
        <Route path="/universities" element={<Universities />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<ViewEvent />} />
        <Route path="/rsos" element={<RSOs />} />
        <Route path="/rsos/:id" element={<ViewRSO />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/login" element={<LoginPage />} />

        
      </Routes>
    </BrowserRouter>
  )
}

export default App
