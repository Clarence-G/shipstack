import { Routes, Route } from 'react-router-dom'
import { RootLayout } from './layouts/root.layout'
import { HomePage } from './pages/home'
import { LoginPage } from './pages/auth/login'
import { RegisterPage } from './pages/auth/register'

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}
