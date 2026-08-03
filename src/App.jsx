import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AuthProvider from './context/AuthProvider'
import { RequireAuth, RequireRole } from './components/auth/RequireAuth'
import Login from './components/auth/Login'
import DashboardLayout from './components/layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Pedidos from './pages/Pedidos'
import Operaciones from './pages/Operaciones'
import Instalacion from './pages/Instalacion'
import Finanzas from './pages/Finanzas'
import Postventa from './pages/Postventa'
import Usuarios from './pages/Usuarios'
import Reportes from './pages/Reportes'
import Perfil from './pages/Perfil'
import Activacion from './pages/Activacion'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Acceso público */}
          <Route path="/login" element={<Login />} />
          <Route path="/activar" element={<Activacion />} />

          {/* Zona protegida (requiere sesión) */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<RequireRole moduleKey="dashboard"><Dashboard /></RequireRole>} />
            <Route path="pedidos" element={<RequireRole moduleKey="pedidos"><Pedidos /></RequireRole>} />
            <Route path="operaciones" element={<RequireRole moduleKey="operaciones"><Operaciones /></RequireRole>} />
            <Route path="instalacion" element={<RequireRole moduleKey="instalacion"><Instalacion /></RequireRole>} />
            <Route path="finanzas" element={<RequireRole moduleKey="finanzas"><Finanzas /></RequireRole>} />
            <Route path="postventa" element={<RequireRole moduleKey="postventa"><Postventa /></RequireRole>} />
            <Route path="reportes" element={<RequireRole moduleKey="reportes"><Reportes /></RequireRole>} />
            <Route path="usuarios" element={<RequireRole moduleKey="usuarios"><Usuarios /></RequireRole>} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App