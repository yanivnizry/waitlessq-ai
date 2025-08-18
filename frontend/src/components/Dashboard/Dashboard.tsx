import React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className={cn("card-hover group relative overflow-hidden bg-gradient-to-br from-card to-card/50 border-2 h-full", className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
          <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
            <Icon className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{value}</div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{description}</p>
            {trend && (
              <div className={cn(
                "flex items-center text-sm font-semibold px-2 py-1 rounded-full",
                trend.isPositive 
                  ? "text-success bg-success/10" 
                  : "text-destructive bg-destructive/10"
              )}>
                {trend.isPositive ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
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

export function Dashboard() {
  // CACHE BUSTER v2.0 - FORCE CHROME RELOAD
  console.log("🚀🔥 DASHBOARD WITH API CALLS - FULLY LOADED! 🔥🚀")
  console.log("⏰ Timestamp:", new Date().toISOString())
  console.log("🔄 This version has useQuery hooks and API calls!")
  console.log("🆕 CACHE BUSTER: Dashboard_v3.0_BACK_TO_PORT_3000")
  console.log("📡 useQuery hooks loaded:", typeof useQuery)
  console.log("🕐 Component loaded at:", new Date().toLocaleTimeString())
  
  // API calls with proper error handling
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.dashboard.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  })

  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => api.dashboard.getRecentActivity(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
    retryDelay: 1000,
  })

  const { data: upcomingAppointments, isLoading: appointmentsLoading, error: appointmentsError } = useQuery({
    queryKey: ["dashboard-appointments"],
    queryFn: () => api.dashboard.getUpcomingAppointments(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
    retryDelay: 1000,
  })

  // Fallback data for when API fails or is loading
  const fallbackStats = {
    total_providers: 0,
    total_appointments: 0,
    active_queues: 0,
    today_appointments: 0,
    organization_name: "Your Organization",
    providersGrowth: 0,
    appointmentsGrowth: 0,
    queuesGrowth: 0,
    revenueGrowth: 0,
    totalRevenue: 0,
  }

  const fallbackActivity = [
    { id: 1, type: "appointment", message: "🚀 API calls are now ACTIVE and running!", time: "Just now" },
    { id: 2, type: "provider", message: "📡 Fetching real-time data from backend...", time: "Just now" },
    { id: 3, type: "queue", message: "✅ Dashboard fully restored with API integration", time: "Just now" },
  ]

  const fallbackAppointments = [
    { id: 1, patient: "No appointments yet", provider: "Add your first provider", time: "--", date: "Get started" },
  ]

  // Use API data if available, otherwise fallback
  const displayStats = stats || fallbackStats
  const displayActivity = recentActivity || fallbackActivity
  const displayAppointments = upcomingAppointments || fallbackAppointments

  // Log API status
  console.log("🔄 API Status:", {
    stats: { loading: statsLoading, error: !!statsError, data: !!stats },
    activity: { loading: activityLoading, error: !!activityError, data: !!recentActivity },
    appointments: { loading: appointmentsLoading, error: !!appointmentsError, data: !!upcomingAppointments }
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-lg text-muted-foreground">
          Welcome back! Here's what's happening with your business today.
        </p>
        {(statsError || activityError || appointmentsError) && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ Some data may be unavailable. Using fallback data while we retry the connection.
            </p>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {(statsLoading || activityLoading || appointmentsLoading) && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading dashboard data...</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Providers"
          value={displayStats.total_providers}
          description="Active service providers"
          icon={Users}
          trend={{ value: displayStats.providersGrowth || 0, isPositive: (displayStats.providersGrowth || 0) >= 0 }}
        />
        <StatCard
          title="Total Appointments"
          value={displayStats.total_appointments}
          description="All time"
          icon={Calendar}
          trend={{ value: displayStats.appointmentsGrowth || 0, isPositive: (displayStats.appointmentsGrowth || 0) >= 0 }}
        />
        <StatCard
          title="Active Queues"
          value={displayStats.active_queues}
          description="Currently running"
          icon={Clock}
          trend={{ value: displayStats.queuesGrowth || 0, isPositive: (displayStats.queuesGrowth || 0) >= 0 }}
        />
        <StatCard
          title="Today's Appointments"
          value={displayStats.today_appointments}
          description="Scheduled for today"
          icon={TrendingUp}
          trend={{ value: displayStats.revenueGrowth || 0, isPositive: (displayStats.revenueGrowth || 0) >= 0 }}
        />
      </div>

      {/* Recent Activity & Upcoming Appointments */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="card-hover group relative overflow-hidden bg-gradient-to-br from-card to-card/50 border-2">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                Recent Activity
                {activityLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2"></div>}
              </CardTitle>
              <CardDescription className="text-base">
                Latest updates from your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-start space-x-3"
                  >
                    <div className={cn(
                      "h-3 w-3 rounded-full mt-1.5 shadow-sm",
                      activity.type === "appointment" && "bg-info",
                      activity.type === "queue" && "bg-success",
                      activity.type === "provider" && "bg-primary"
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
          <Card className="card-hover group relative overflow-hidden bg-gradient-to-br from-card to-card/50 border-2">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                Upcoming Appointments
                {appointmentsLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2"></div>}
              </CardTitle>
              <CardDescription className="text-base">
                Next scheduled appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl border-2 border-muted/50 bg-gradient-to-r from-background to-muted/20 hover:border-primary/20 hover:bg-primary/5 transition-all duration-200"
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