import { Route, Routes } from 'react-router-dom'
import { RootLayout } from './layouts/root.layout'
import { LoginPage } from './pages/auth/login'
import { RegisterPage } from './pages/auth/register'
import { HomePage } from './pages/home'
import { NotFoundPage } from './pages/not-found'

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
