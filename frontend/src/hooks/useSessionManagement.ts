/**
 * Hook for setting up session management with navigation
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setSessionCallbacks } from '../utils/session'
import { useAuth } from '../contexts/AuthContext'

export function useSessionManagement() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    // Set up session management callbacks
    setSessionCallbacks({
      onSessionExpired: () => {
        console.log('🔐 Session expired - logging out and redirecting to login')
        
        // Clear user state through AuthContext
        logout()
        
        // Navigate to login page
        navigate('/login', { replace: true })
      },
      onSessionWarning: (minutesLeft: number) => {
        console.log(`🔐 Session warning: ${minutesLeft} minutes left`)
        // The toast notification is already shown by the session utility
        // Additional UI updates could be added here if needed
      }
    })

    // Cleanup on unmount
    return () => {
      setSessionCallbacks({})
    }
  }, [navigate, logout])
}
