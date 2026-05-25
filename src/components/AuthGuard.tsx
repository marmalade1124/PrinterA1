import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../lib/auth'

/**
 * Protects nested routes behind authentication.
 * Unauthenticated users are redirected to /login with the attempted
 * path stored in location.state.from so LoginPage can redirect back
 * after a successful sign-in.
 */
export default function AuthGuard() {
  const location = useLocation()

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  return <Outlet />
}
