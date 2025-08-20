import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  ArrowUpRight, 
  ArrowDownRight,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react'
import { useRTL } from '../../hooks/useRTL'
import { useNavigate } from 'react-router-dom'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { useAuthStore } from '../../store/auth-store'
import { api } from '../../lib/api-client'
import { cn } from '../../lib/utils'
import GamificationWidget from '../Gamification/GamificationWidget'
import QuickAddButton from './QuickAddButton'

// StatCard component
interface StatCardProps {
  title: string
  value: number
  description: string
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  const { isRTL, getFlexDirection } = useRTL()
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("", className)}>
        <CardHeader className={cn(getFlexDirection("flex flex-row items-center justify-between space-y-0 pb-2"))}>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{description}</p>
            {trend && (
              <div className={cn(
                "flex items-center text-xs",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function DashboardFreshFixed() {
  console.log("🚀 FIXED DASHBOARD COMPONENT")
  
  const { t } = useTranslation()
  const { isRTL, getFlexDirection } = useRTL()
  const token = localStorage.getItem("token")
  const authStore = useAuthStore()
  const navigate = useNavigate()
  
  // API calls with conservative retry settings
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.dashboard.getStats(),
    enabled: !!(token || authStore.token),
    staleTime: 5 * 60 * 1000,
    retry: false, // Disable retries to prevent rate limiting
    refetchInterval: false, // Disable automatic refetching
  })

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => api.dashboard.getRecentActivity(),
    enabled: !!(token || authStore.token),
    staleTime: 2 * 60 * 1000,
    retry: false, // Disable retries to prevent rate limiting
    refetchInterval: false, // Disable automatic refetching
  })

  const { data: upcomingAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["dashboard-appointments"],
    queryFn: () => api.dashboard.getUpcomingAppointments(),
    enabled: !!(token || authStore.token),
    staleTime: 2 * 60 * 1000,
    retry: false, // Disable retries to prevent rate limiting
    refetchInterval: false, // Disable automatic refetching
  })

  // Fallback data
  const fallbackStats = {
    total_providers: 0,
    total_appointments: 0,
    active_queues: 0,
    today_appointments: 0,
    organization_name: "Your Organization"
  }

  const fallbackActivity = [
    { id: 1, type: "appointment", message: "🚀 Dashboard ready with all features!", time: "Just now" },
    { id: 2, type: "provider", message: "📡 Real-time data loading from backend...", time: "Just now" },
    { id: 3, type: "queue", message: "✅ Authentication working perfectly!", time: "Just now" },
  ]

  const fallbackAppointments = [
    { 
      id: 1, 
      patient: "No appointments scheduled", 
      provider: "Appointments will appear here", 
      time: "--", 
      date: "Get started" 
    },
  ]

  // Use API data if available, otherwise fallback
  const displayStats = stats || fallbackStats
  const displayActivity = recentActivity || fallbackActivity
  const displayAppointments = upcomingAppointments || fallbackAppointments

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(getFlexDirection("flex items-center justify-between"))}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {t('dashboard.welcomeMessage')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <QuickAddButton />
        </div>
        
        {stats && typeof stats === 'object' && 'organization_name' in stats && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">{t('dashboard.organization')}</span> {stats.organization_name || t('dashboard.yourOrganization')}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {t('dashboard.organizationScope')}
            </p>
          </div>
        )}
      </div>

      {/* Status */}
      <div className={`mt-2 p-2 rounded-md ${
        token 
          ? statsError 
            ? "bg-red-50 border border-red-200" 
            : "bg-blue-50 border border-blue-200"
          : "bg-yellow-50 border border-yellow-200"
      }`}>
        <div className={`text-sm ${
          token 
            ? statsError 
              ? "text-red-800" 
              : "text-blue-800"
            : "text-yellow-800"
        }`}>
          <p>
            {token 
              ? statsError 
                ? `❌ API Error: ${(statsError as any)?.message || 'Authentication failed'}`
                : statsLoading 
                  ? "⏳ Loading dashboard data..."
                  : stats
                    ? "✅ Dashboard data loaded successfully!"
                    : "📊 Dashboard ready - data will load automatically"
              : "⚠️ No authentication token found - Please log in"
            }
          </p>
          
          {!token && (
            <div className="mt-2">
              <Button 
                onClick={() => window.location.href = "/login"}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go to Login
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Get Started section when no providers */}
      {stats && typeof stats === 'object' && 'total_providers' in stats && stats.total_providers === 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className={cn(getFlexDirection("flex items-center justify-between"))}>
            <div>
              <h3 className="font-medium text-blue-900">{t('dashboard.readyToStart')}</h3>
              <p className="text-sm text-blue-700 mt-1">
                {t('dashboard.addFirstProvider')}
              </p>
            </div>
            <Button
              onClick={() => navigate("/providers")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t('dashboard.addProvider')}
            </Button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {(statsLoading || activityLoading || appointmentsLoading) && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                        <p className="text-sm text-muted-foreground mt-2">{t('dashboard.loadingFreshData')}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.totalProviders')}
          value={displayStats.total_providers}
          description={t('dashboard.totalProvidersDesc')}
          icon={Users}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title={t('dashboard.totalAppointments')}
          value={displayStats.total_appointments}
          description={t('dashboard.totalAppointmentsDesc')}
          icon={Calendar}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title={t('dashboard.activeQueues')}
          value={displayStats.active_queues}
          description={t('dashboard.activeQueuesDesc')}
          icon={Clock}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title={t('dashboard.todayAppointments')}
          value={displayStats.today_appointments}
          description={t('dashboard.todayAppointmentsDesc')}
          icon={TrendingUp}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Gamification Widget */}
      <div className="mt-6">
        <GamificationWidget />
      </div>

      {/* Recent Activity & Upcoming Appointments */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
                      <Card>
              <CardHeader>
                <CardTitle className={cn(getFlexDirection("flex items-center gap-2"))}>
                  <Activity className="h-5 w-5" />
                  {t('dashboard.recentActivity')}
                </CardTitle>
              <CardDescription>
                {t('dashboard.recentActivityDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayActivity.map((activity: any, index: number) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full mt-2",
                      activity.type === "appointment" && "bg-blue-500",
                      activity.type === "queue" && "bg-green-500",
                      activity.type === "provider" && "bg-purple-500"
                    )} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Appointments */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
                      <Card>
              <CardHeader>
                <CardTitle className={cn(getFlexDirection("flex items-center gap-2"))}>
                  <Calendar className="h-5 w-5" />
                  {t('dashboard.upcomingAppointments')}
                </CardTitle>
              <CardDescription>
                {t('dashboard.upcomingAppointmentsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayAppointments.map((appointment: any, index: number) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{appointment.patient}</p>
                      <p className="text-xs text-muted-foreground">{appointment.provider}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{appointment.time}</p>
                      <p className="text-xs text-muted-foreground">{appointment.date}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
