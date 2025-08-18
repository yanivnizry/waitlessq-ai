/**
 * Session management utilities for handling JWT token expiry and automatic logout
 */

import { toast } from 'sonner'
import { isTokenExpired, getTimeUntilExpiry } from './jwt'

// Global session management state
let sessionCheckInterval: NodeJS.Timeout | null = null
let sessionWarningShown = false

/**
 * Session management callbacks
 */
interface SessionCallbacks {
  onSessionExpired?: () => void
  onSessionWarning?: (minutesLeft: number) => void
}

let sessionCallbacks: SessionCallbacks = {}

/**
 * Set session management callbacks
 */
export function setSessionCallbacks(callbacks: SessionCallbacks) {
  sessionCallbacks = callbacks
}

/**
 * Clear authentication data and redirect to login
 */
export function handleSessionExpiry() {
  console.log('🔐 Session expired - clearing auth data')
  
  // Clear all auth data
  localStorage.removeItem('token')
  sessionWarningShown = false
  
  // Stop session monitoring
  stopSessionMonitoring()
  
  // Show toast notification
  toast.error('Your session has expired. Please log in again.', {
    duration: 5000,
    position: 'top-center'
  })
  
  // Call callback if provided
  if (sessionCallbacks.onSessionExpired) {
    sessionCallbacks.onSessionExpired()
  } else {
    // Fallback redirect
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
}

/**
 * Show session warning when token is about to expire
 */
function showSessionWarning(minutesLeft: number) {
  if (sessionWarningShown) return
  
  sessionWarningShown = true
  
  toast.warning(`Your session will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}. Please save your work.`, {
    duration: 10000,
    position: 'top-center'
  })
  
  // Call callback if provided
  if (sessionCallbacks.onSessionWarning) {
    sessionCallbacks.onSessionWarning(minutesLeft)
  }
}

/**
 * Check current session status
 */
function checkSessionStatus() {
  const token = localStorage.getItem('token')
  
  if (!token) {
    console.log('🔐 No token found - stopping session monitoring')
    stopSessionMonitoring()
    return
  }
  
  if (isTokenExpired(token)) {
    console.log('🔐 Token expired - handling session expiry')
    handleSessionExpiry()
    return
  }
  
  // Check if token expires soon (within 5 minutes)
  const timeUntilExpiry = getTimeUntilExpiry(token)
  const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60))
  
  if (minutesUntilExpiry <= 5 && minutesUntilExpiry > 0) {
    showSessionWarning(minutesUntilExpiry)
  }
}

/**
 * Start monitoring session expiry
 */
export function startSessionMonitoring() {
  // Don't start if already running
  if (sessionCheckInterval) {
    return
  }
  
  console.log('🔐 Starting session monitoring')
  
  // Check immediately
  checkSessionStatus()
  
  // Then check every 30 seconds
  sessionCheckInterval = setInterval(checkSessionStatus, 30 * 1000)
}

/**
 * Stop monitoring session expiry
 */
export function stopSessionMonitoring() {
  if (sessionCheckInterval) {
    console.log('🔐 Stopping session monitoring')
    clearInterval(sessionCheckInterval)
    sessionCheckInterval = null
  }
  sessionWarningShown = false
}

/**
 * Check if user has a valid session
 */
export function hasValidSession(): boolean {
  const token = localStorage.getItem('token')
  if (!token) return false
  return !isTokenExpired(token)
}

/**
 * Initialize session management
 */
export function initializeSessionManagement() {
  // Start monitoring if user has a token
  const token = localStorage.getItem('token')
  if (token && !isTokenExpired(token)) {
    startSessionMonitoring()
  }
}
