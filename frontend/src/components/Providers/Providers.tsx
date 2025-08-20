import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { useRTL } from "../../hooks/useRTL"
import { 
  UserPlus, 
  Users, 
  Edit, 
  Trash2, 
  Phone, 
  MapPin,
  Clock
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
// import { useAuthStore } from "@/store/auth-store" // Will be used for additional auth checks

interface Provider {
  id: number
  business_name: string
  business_description?: string
  phone?: string
  address?: string
  is_active: boolean
  created_at: string
}

interface ProviderFormData {
  business_name: string
  phone: string
}

export function Providers() {
  const { t } = useTranslation()
  const { isRTL, getFlexDirection, getMargin } = useRTL()
  const [showForm, setShowForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [formData, setFormData] = useState<ProviderFormData>({
    business_name: "",
    phone: "",
  })

  const queryClient = useQueryClient()
  // const authStore = useAuthStore() // Will be used for additional auth checks

  // Fetch providers
  const { data: providers, isLoading, error } = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.providers.getAll(),
    staleTime: 5 * 60 * 1000,
  })

  // Create provider mutation
  const createProviderMutation = useMutation({
    mutationFn: (data: ProviderFormData) => api.providers.create(data),
    onSuccess: () => {
      // Invalidate both providers and dashboard queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["providers"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
      setShowForm(false)
      resetForm()
    },
  })

  // Update provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProviderFormData> }) =>
      api.providers.update(id, data),
    onSuccess: () => {
      // Invalidate both providers and dashboard queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["providers"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      setEditingProvider(null)
      resetForm()
    },
  })

  // Delete provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: (id: number) => api.providers.delete(id),
    onSuccess: () => {
      // Invalidate both providers and dashboard queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["providers"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
    },
  })

  const resetForm = () => {
    setFormData({
      business_name: "",
      phone: "",
    })
    setShowForm(false)
    setEditingProvider(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingProvider) {
      updateProviderMutation.mutate({ id: editingProvider.id, data: formData })
    } else {
      createProviderMutation.mutate(formData)
    }
  }

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setFormData({
      business_name: provider.business_name,
      phone: provider.phone || "",
    })
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this provider?")) {
      deleteProviderMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('providers.title')}</h1>
          <p className="text-muted-foreground">
            {t('providers.manageProviders')}
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {t('providers.add')}
        </Button>
      </div>

      {/* Add/Edit Provider Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {editingProvider ? t('providers.edit') : t('providers.addNew')}
              </CardTitle>
              <CardDescription>
                {editingProvider
                  ? t('providers.updateInfo')
                  : t('providers.createNew')}
              </CardDescription>
              {!editingProvider && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <span className="font-medium">{t('providers.multiTenant')}:</span> {t('providers.multiTenantDesc')} 
                    Only users in your organization can see and manage this provider's appointments and queues.
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t('providers.businessName')} *</label>
                    <Input
                      value={formData.business_name}
                      onChange={(e) =>
                        setFormData({ ...formData, business_name: e.target.value })
                      }
                      placeholder={t('providers.businessNamePlaceholder')}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('providers.phoneNumber')}</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('providers.phoneOptional')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={
                      createProviderMutation.isPending ||
                      updateProviderMutation.isPending
                    }
                  >
                    {createProviderMutation.isPending ||
                    updateProviderMutation.isPending
                      ? t('common.saving')
                      : editingProvider
                      ? t('providers.updateProvider')
                      : t('providers.createProvider')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-muted-foreground mt-2">{t('providers.loading')}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">
              {t('providers.loadError')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!providers || providers.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('providers.noProviders')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('providers.getStarted')}
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('providers.addFirstProvider')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Providers Grid */}
      {providers && providers.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider: Provider, index: number) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {provider.business_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            provider.is_active ? "bg-green-500" : "bg-red-500"
                          )}
                        />
                        <span className="text-sm text-muted-foreground">
                          {provider.is_active ? t('providers.active') : t('providers.inactive')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(provider)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(provider.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {provider.business_description && (
                    <p className="text-sm text-muted-foreground">
                      {provider.business_description}
                    </p>
                  )}
                  <div className="space-y-2">
                    {provider.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{provider.phone}</span>
                      </div>
                    )}
                    {provider.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{provider.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Added {new Date(provider.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
