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
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"

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
    >
      <Card className={cn("", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center space-x-2">
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

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.dashboard.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => api.dashboard.getRecentActivity(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  const { data: upcomingAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["dashboard-appointments"],
    queryFn: () => api.dashboard.getUpcomingAppointments(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })

  // Mock data for demonstration
  const mockStats = {
    totalProviders: 12,
    totalAppointments: 156,
    activeQueues: 8,
    totalRevenue: 15420,
    providersGrowth: 12,
    appointmentsGrowth: 8,
    queuesGrowth: -3,
    revenueGrowth: 23,
  }

  const mockRecentActivity = [
    { id: 1, type: "appointment", message: "New appointment booked for Dr. Smith", time: "2 minutes ago" },
    { id: 2, type: "queue", message: "Patient joined queue at Dental Clinic", time: "5 minutes ago" },
    { id: 3, type: "provider", message: "New provider registered: Dr. Johnson", time: "1 hour ago" },
    { id: 4, type: "appointment", message: "Appointment completed: Dr. Wilson", time: "2 hours ago" },
  ]

  const mockUpcomingAppointments = [
    { id: 1, patient: "John Doe", provider: "Dr. Smith", time: "10:00 AM", date: "Today" },
    { id: 2, patient: "Jane Smith", provider: "Dr. Johnson", time: "2:30 PM", date: "Today" },
    { id: 3, patient: "Mike Wilson", provider: "Dr. Brown", time: "9:00 AM", date: "Tomorrow" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Providers"
          value={mockStats.totalProviders}
          description="Active service providers"
          icon={Users}
          trend={{ value: mockStats.providersGrowth, isPositive: mockStats.providersGrowth > 0 }}
        />
        <StatCard
          title="Appointments"
          value={mockStats.totalAppointments}
          description="This month"
          icon={Calendar}
          trend={{ value: mockStats.appointmentsGrowth, isPositive: mockStats.appointmentsGrowth > 0 }}
        />
        <StatCard
          title="Active Queues"
          value={mockStats.activeQueues}
          description="Currently running"
          icon={Clock}
          trend={{ value: mockStats.queuesGrowth, isPositive: mockStats.queuesGrowth > 0 }}
        />
        <StatCard
          title="Revenue"
          value={`$${mockStats.totalRevenue.toLocaleString()}`}
          description="This month"
          icon={TrendingUp}
          trend={{ value: mockStats.revenueGrowth, isPositive: mockStats.revenueGrowth > 0 }}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates from your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-start space-x-3"
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
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Appointments
              </CardTitle>
              <CardDescription>
                Next scheduled appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUpcomingAppointments.map((appointment, index) => (
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