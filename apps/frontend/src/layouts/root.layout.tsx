import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useSession, signOut } from '@/lib/auth-client'

export function RootLayout() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <nav className="container mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="font-semibold text-lg">
            MyApp
          </Link>

          <div className="flex items-center gap-4">
            {isPending ? (
              <span className="text-sm text-muted-foreground">Loading...</span>
            ) : session ? (
              <>
                <span className="text-sm">{session.user.name}</span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="text-sm hover:underline">
                  Login
                </Link>
                <Link to="/auth/register" className="text-sm hover:underline">
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
