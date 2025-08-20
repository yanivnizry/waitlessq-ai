import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/store/auth-store"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher"

interface LoginFormProps {
  onSuccess?: () => void
  className?: string
}

export function LoginForm({ onSuccess, className }: LoginFormProps) {
  const { t } = useTranslation()
  
  const loginSchema = z.object({
    email: z.string().email(t('auth.validation.email')),
    password: z.string().min(1, t('auth.validation.required')),
  })
  
  type LoginFormData = z.infer<typeof loginSchema>
  const navigate = useNavigate()
  const { login, setError, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      console.log("🔐 Starting login process...")
      setIsLoading(true)
      clearError()

      console.log("🔐 Calling login API...")
      const response = await api.auth.login(data.email, data.password)
      console.log("🔐 Login response:", response)
      
      // Store token immediately so it's available for the next request
      console.log("🔐 Storing token in localStorage...")
      localStorage.setItem("token", response.access_token)
      
      // Verify token was stored
      const storedToken = localStorage.getItem("token")
      console.log("🔐 Verified stored token:", storedToken ? `${storedToken.substring(0, 50)}...` : "NOT FOUND")
      
      // Force a small delay and double-check token availability
      await new Promise(resolve => setTimeout(resolve, 200))
      const doubleCheckToken = localStorage.getItem("token")
      console.log("🔐 Double-check token:", doubleCheckToken ? `${doubleCheckToken.substring(0, 50)}...` : "NOT FOUND")
      
      // Get user data
      console.log("🔐 Getting current user...")
      const userResponse = await api.auth.getCurrentUser()
      console.log("🔐 User response:", userResponse)
      
      console.log("🔐 Storing auth data in store...")
      login(response.access_token, userResponse)
      toast.success(t('auth.login.success'))
      
      console.log("🔐 Navigating to dashboard...")
      onSuccess?.()
      navigate("/dashboard")
      console.log("🔐 Login process completed!")
    } catch (error: any) {
      console.error("🔐 LOGIN ERROR:", error)
      console.error("🔐 Error response:", error.response)
      console.error("🔐 Error data:", error.response?.data)
      
      let errorMessage = "Login failed. Please try again."
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (Array.isArray(detail)) {
          // Handle validation errors from backend
          errorMessage = detail.map((err: any) => err.msg).join(", ")
        } else if (typeof detail === 'string') {
          errorMessage = detail
        }
      }
      
      console.error("🔐 Final error message:", errorMessage)
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("w-full max-w-md", className)}
    >
      {/* Language Switcher */}
      <div className="mb-6 flex justify-center">
        <LanguageSwitcher />
      </div>
      
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('auth.login.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.login.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
            console.log("🔐 Form submit event triggered")
            e.preventDefault()
            handleSubmit(onSubmit)(e)
          }} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t('auth.login.email')}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.login.email')}
                {...register("email")}
                className={cn(errors.email && "border-red-500")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.login.password')}
                  {...register("password")}
                  className={cn(errors.password && "border-red-500")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message?.toString()}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.login.submit')}...
                </>
              ) : (
                t('auth.login.submit')
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm"
                onClick={() => navigate("/register")}
              >
                {t('auth.login.noAccount')} {t('auth.login.signUp')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
} 