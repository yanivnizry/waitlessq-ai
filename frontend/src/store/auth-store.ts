import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface User {
  id: number
  email: string
  full_name: string
  phone?: string
  is_active: boolean
  created_at: string
  organization_id: number
  role: "owner" | "admin" | "manager" | "staff" | "viewer"
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface AuthActions {
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
  setToken: (token: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: (token: string, user: User) => {
        // Store token in localStorage for API client
        localStorage.setItem("token", token)
        set({
          token,
          user,
          isAuthenticated: true,
          error: null,
        })
      },

      logout: () => {
        // Remove token from localStorage
        localStorage.removeItem("token")
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        })
      },

      setUser: (user: User) =>
        set({
          user,
          isAuthenticated: true,
        }),

      setToken: (token: string) => {
        // Store token in localStorage for API client
        localStorage.setItem("token", token)
        set({
          token,
          isAuthenticated: true,
        })
      },

      setLoading: (isLoading: boolean) =>
        set({
          isLoading,
        }),

      setError: (error: string | null) =>
        set({
          error,
        }),

      clearError: () =>
        set({
          error: null,
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
) 