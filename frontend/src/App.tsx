import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import ViewRSO from './pages/ViewRSO'
import ViewEvent from './pages/ViewEvent'
import Universities from './pages/Universities'
import SuperAdmin from './pages/SuperAdmin'
import Events from './pages/Events'
import RSOs from './pages/RSOs'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RSOAdmin from './pages/RSOAdmin'
import CreateEvent from './pages/CreateEvent'
import CreateRSO from './pages/CreateRSO'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/universities" element={<Universities />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<ViewEvent />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/rsos" element={<RSOs />} />
        <Route path="/rsos/create" element={<CreateRSO />} />
        <Route path="/rsos/:id" element={<ViewRSO />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/rso-admin" element={<RSOAdmin />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
