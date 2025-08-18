/**
 * JWT Token utilities for handling token expiry and validation
 */

interface JWTPayload {
  sub: string // subject (usually email)
  exp: number // expiration time (unix timestamp)
  iat?: number // issued at (unix timestamp)
}

/**
 * Decode JWT token without verification (for client-side expiry checking)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT has 3 parts: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode the payload (base64url)
    const payload = parts[1]
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodedPayload)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) {
    return true
  }

  // Convert to milliseconds and add small buffer (30 seconds)
  const expirationTime = payload.exp * 1000
  const currentTime = Date.now()
  const bufferTime = 30 * 1000 // 30 seconds

  return currentTime >= (expirationTime - bufferTime)
}

/**
 * Get token expiration time in milliseconds
 */
export function getTokenExpirationTime(token: string): number | null {
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) {
    return null
  }
  return payload.exp * 1000
}

/**
 * Get time until token expires in milliseconds
 */
export function getTimeUntilExpiry(token: string): number {
  const expirationTime = getTokenExpirationTime(token)
  if (!expirationTime) {
    return 0
  }
  return Math.max(0, expirationTime - Date.now())
}

/**
 * Get user email from JWT token
 */
export function getUserEmailFromToken(token: string): string | null {
  const payload = decodeJWT(token)
  return payload?.sub || null
}
