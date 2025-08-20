import React from "react"
import { motion } from "framer-motion"
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  Settings, 
  LogOut,
  Menu,
  X,
  UserCheck,
  CalendarClock,
  Briefcase,
  Trophy
} from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { Button } from "../ui/button"
import { useRTL } from "../../hooks/useRTL"
import { useAuthStore } from "../../store/auth-store"
import { cn } from "../../lib/utils"
import FloatingActionButton from "../ui/FloatingActionButton"
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher"

interface LayoutProps {
  children: React.ReactNode
}

// Navigation updated at 2024-12-20 19:00 - ADDED QUICK APPOINTMENT - FORCE CACHE BREAK v6
// Navigation will be created dynamically with translations

// // Debug: Log navigation to console to verify it's loading
// console.log("🔥 NAVIGATION LOADED:", navigation.map(n => n.name))

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const { t } = useTranslation()
  const { isRTL, getFlexDirection } = useRTL()

  // Create navigation with translations
  const navigation = [
    { name: t('navigation.dashboard'), href: "/dashboard", icon: LayoutDashboard },
    { name: t('navigation.calendar'), href: "/calendar", icon: Calendar },
    { name: t('navigation.providers'), href: "/providers", icon: Users },
    { name: t('navigation.services'), href: "/services", icon: Briefcase },
    { name: t('navigation.clients'), href: "/clients", icon: UserCheck },
    { name: t('navigation.appointments'), href: "/appointments", icon: CalendarClock },
    { name: t('navigation.queues'), href: "/queues", icon: Clock },
    { name: t('navigation.availability'), href: "/availability", icon: CalendarClock },
    { name: t('navigation.achievements'), href: "/achievements", icon: Trophy },
    { name: t('navigation.settings'), href: "/settings", icon: Settings },
  ]

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
        <motion.div
          initial={{ x: isRTL ? "100%" : "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: isRTL ? "100%" : "-100%" }}
          transition={{ type: "spring", damping: 20 }}
          className={cn(
            "fixed top-0 h-full w-64 bg-card",
            isRTL ? "right-0 border-l" : "left-0 border-r"
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center justify-between px-4 border-b">
              <div className="flex items-center">
                            <h1 className="text-xl font-bold">{t('layout.appName')}</h1>
            <div className="ml-2 text-xs text-green-500">{t('layout.quickVersion')}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive && "bg-secondary"
                    )}
                    onClick={() => {
                      navigate(item.href)
                      setSidebarOpen(false)
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Button>
                )
              })}
            </nav>
            <div className="border-t p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {user?.full_name?.charAt(0) || "U"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                                  <LogOut className={cn("h-5 w-5", isRTL ? "ml-3" : "mr-3")} />
                  {t('common.logout')}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col",
        isRTL ? "lg:right-0" : "lg:left-0"
      )}>
        <div className={cn(
          "flex grow flex-col gap-y-5 overflow-y-auto bg-card px-6",
          isRTL ? "border-l" : "border-r"
        )}>
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-bold">{t('layout.appName')}</h1>
            <div className="ml-2 text-xs text-green-500">{t('layout.live')}</div>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <li key={item.name}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3",
                            isActive && "bg-secondary"
                          )}
                          onClick={() => navigate(item.href)}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.name}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {user?.full_name?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  {t('common.logout')}
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={isRTL ? "lg:pr-64" : "lg:pl-64"}>
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <LanguageSwitcher />
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-sm font-medium"
              >
                {t('common.logout')}
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex sticky top-0 z-40 h-16 shrink-0 items-center justify-end gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6">
                      <div className="flex items-center gap-x-4">
              <LanguageSwitcher />
              <div className="flex items-center gap-x-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {user?.full_name || user?.email}
                </span>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-sm font-medium"
                >
                  {t('common.logout')}
                </Button>
              </div>
            </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
      
      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  )
} 