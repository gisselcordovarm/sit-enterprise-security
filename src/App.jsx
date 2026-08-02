import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Pedidos from './pages/Pedidos'
import Operaciones from './pages/Operaciones'
import Instalacion from './pages/Instalacion'
import Finanzas from './pages/Finanzas'
import Postventa from './pages/Postventa'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="operaciones" element={<Operaciones />} />
          <Route path="instalacion" element={<Instalacion />} />
          <Route path="finanzas" element={<Finanzas />} />
          <Route path="postventa" element={<Postventa />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
