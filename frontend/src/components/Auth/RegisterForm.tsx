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

interface RegisterFormProps {
  onSuccess?: () => void
  className?: string
}

export function RegisterForm({ onSuccess, className }: RegisterFormProps) {
  const { t } = useTranslation()
  
  const registerSchema = z.object({
    full_name: z.string().min(2, t('auth.validation.minLength', { count: 2 })),
    email: z.string().email(t('auth.validation.email')),
    password: z
      .string()
      .min(8, t('auth.validation.minLength', { count: 8 }))
      .regex(/[A-Z]/, t('auth.validation.passwordStrength'))
      .regex(/[a-z]/, t('auth.validation.passwordStrength'))
      .regex(/[0-9]/, t('auth.validation.passwordStrength'))
      .regex(/[^A-Za-z0-9]/, t('auth.validation.passwordStrength')),
    confirmPassword: z.string(),
    phone: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.validation.passwordMatch'),
    path: ["confirmPassword"],
  })
  
  type RegisterFormData = z.infer<typeof registerSchema>
  const navigate = useNavigate()
  const { login, setError, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch("password")

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, color: "bg-gray-200" }
    
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    
    const colors = {
      0: "bg-red-500",
      1: "bg-red-500",
      2: "bg-yellow-500",
      3: "bg-yellow-500",
      4: "bg-green-500",
      5: "bg-green-500",
    }
    
    return { score, color: colors[score as keyof typeof colors] }
  }

  const passwordStrength = getPasswordStrength(password)

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true)
      clearError()

      await api.auth.register({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone,
      })
      
      // Auto-login after successful registration
      const loginResponse = await api.auth.login(data.email, data.password)
      const userResponse = await api.auth.getCurrentUser()
      
      login(loginResponse.access_token, userResponse)
      toast.success(t('auth.register.success'))
      
      onSuccess?.()
      navigate("/dashboard")
    } catch (error: any) {
      let errorMessage = "Registration failed. Please try again."
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (Array.isArray(detail)) {
          // Handle validation errors from backend
          errorMessage = detail.map((err: any) => err.msg).join(", ")
        } else if (typeof detail === 'string') {
          errorMessage = detail
        }
      }
      
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
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('auth.register.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.register.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="full_name" className="text-sm font-medium">
                {t('auth.register.fullName')}
              </label>
              <Input
                id="full_name"
                type="text"
                placeholder={t('auth.register.fullName')}
                {...register("full_name")}
                className={cn(errors.full_name && "border-red-500")}
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.full_name.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t('auth.register.email')}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.register.email')}
                {...register("email")}
                className={cn(errors.email && "border-red-500")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                {t('auth.register.phone')} ({t('common.optional')})
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('auth.register.phone')}
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t('auth.register.password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.register.password')}
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
              
              {/* Password strength indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          level <= passwordStrength.score
                            ? passwordStrength.color
                            : "bg-gray-200"
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{t('auth.validation.passwordStrength')}:</span>
                    <span className={cn(
                      passwordStrength.score <= 2 ? "text-red-500" : "",
                      passwordStrength.score === 3 ? "text-yellow-500" : "",
                      passwordStrength.score >= 4 ? "text-green-500" : ""
                    )}>
                      {passwordStrength.score <= 2 ? t('auth.validation.weak') : ""}
                      {passwordStrength.score === 3 ? t('auth.validation.fair') : ""}
                      {passwordStrength.score >= 4 ? t('auth.validation.strong') : ""}
                    </span>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message?.toString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {t('auth.register.confirmPassword')}
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('auth.register.confirmPassword')}
                  {...register("confirmPassword")}
                  className={cn(errors.confirmPassword && "border-red-500")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message?.toString()}</p>
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
                  {t('auth.register.submit')}...
                </>
              ) : (
                t('auth.register.submit')
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm"
                onClick={() => navigate("/login")}
              >
                {t('auth.register.hasAccount')} {t('auth.register.signIn')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
} 