import { useNavigate } from 'react-router-dom'
import { SignupForm } from '@/components/block/signup-form'

export function RegisterPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm onSuccess={() => navigate('/')} />
      </div>
    </div>
  )
}
