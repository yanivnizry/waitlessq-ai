import React from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Toaster } from "sonner"
import { ThemeProvider } from "next-themes"

import { useAuthStore } from "./store/auth-store"
import { LoginForm } from "./components/Auth/LoginForm"
import { RegisterForm } from "./components/Auth/RegisterForm"
import { ProtectedRoute } from "./components/Auth/ProtectedRoute"
import { DashboardFreshFixed as DashboardFresh } from "./components/Dashboard/DashboardFreshFixed"
import { Providers } from "./components/Providers/Providers"
import { Clients } from "./components/Clients/Clients"
import { Appointments } from "./components/Appointments/Appointments"
import { Queues } from "./components/Queues/Queues"
import { Availability } from "./components/Availability/Availability"
import Calendar from "./components/Calendar/Calendar"
import Services from "./components/Services/Services"
import Gamification from "./components/Gamification/Gamification"
import { Layout } from "./components/Layout/Layout"

// Create a client with more conservative retry settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors (401, 403) or rate limiting (429)
        if (error?.response?.status === 401 || error?.response?.status === 403 || error?.response?.status === 429) {
          return false
        }
        // Only retry up to 2 times for other errors
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <div className="min-h-screen bg-background">
            <Routes>
              {/* Public routes */}
              <Route
                path="/login"
                element={
                  isAuthenticated ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                      <LoginForm />
                    </div>
                  )
                }
              />
              
              <Route
                path="/register"
                element={
                  isAuthenticated ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                      <RegisterForm />
                    </div>
                  )
                }
              />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardFresh />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Providers route */}
              <Route
                path="/providers"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Providers />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Clients route */}
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Clients />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Appointments route */}
              <Route
                path="/appointments"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Appointments />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Queues route */}
              <Route
                path="/queues"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Queues />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Availability route */}
              <Route
                path="/availability"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Availability />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Calendar route */}
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Calendar />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Services route */}
              <Route
                path="/services"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Services />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Achievements route */}
              <Route
                path="/achievements"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Gamification />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to dashboard or login */}
              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />

              {/* Catch all route */}
              <Route
                path="*"
                element={
                  <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
                }
              />
            </Routes>
          </div>
        </Router>
        
        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
            },
          }}
        />
        
        {/* React Query DevTools */}
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App 