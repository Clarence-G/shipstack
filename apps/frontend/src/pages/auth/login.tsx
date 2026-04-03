import { useNavigate } from 'react-router-dom'
import { LoginForm } from '@/components/block/login-form'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm onSuccess={() => navigate('/')} />
      </div>
    </div>
  )
}
