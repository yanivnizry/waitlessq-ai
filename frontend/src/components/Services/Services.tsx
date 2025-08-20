import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../hooks/useRTL'
import { 
  Briefcase,
  UserPlus, 
  Edit, 
  Trash2, 
  Search,
  Clock,
  DollarSign,
  Tag,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../../lib/utils'
import { servicesAPI, providersAPI } from '../../services/api'
import { toast } from 'sonner'

// Types
interface Service {
  id: number
  provider_id: number
  name: string
  description?: string
  duration: number // in minutes
  price: number
  category: string
  is_active: boolean
  max_advance_booking_days?: number
  buffer_time_before?: number // minutes
  buffer_time_after?: number // minutes
  created_at: string
  updated_at?: string
  provider?: {
    id: number
    business_name: string
  }
}

interface Provider {
  id: number
  business_name: string
}

interface ServiceFormData {
  provider_id: number | null
  name: string
  description: string
  duration: number
  price: number
  category: string
  is_active: boolean
  max_advance_booking_days: number
  buffer_time_before: number
  buffer_time_after: number
}

// SERVICE_CATEGORIES will be created dynamically with translations

const Services: React.FC = () => {
  const { t } = useTranslation()
  const { isRTL, getFlexDirection, getMargin } = useRTL()
  
  // Create SERVICE_CATEGORIES dynamically with translations
  const SERVICE_CATEGORIES = [
    t('services.categories.consultation'),
    t('services.categories.treatment'),
    t('services.categories.therapy'),
    t('services.categories.maintenance'),
    t('services.categories.emergency'),
    t('services.categories.followUp'),
    t('services.categories.assessment'),
    t('services.categories.other')
  ]
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showActiveOnly, setShowActiveOnly] = useState(false) // Fixed: Show all services by default
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState<ServiceFormData>({
    provider_id: null,
    name: '',
    description: '',
    duration: 30,
    price: 0,
    category: 'Consultation',
    is_active: true,
    max_advance_booking_days: 30,
    buffer_time_before: 0,
    buffer_time_after: 0
  })

  const queryClient = useQueryClient()

  // Fetch providers
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: () => providersAPI.getProviders(),
  })

  // Fetch services from real API
  const { data: servicesResponse, isLoading, error } = useQuery({
    queryKey: ["services", searchTerm, selectedCategory, showActiveOnly],
    queryFn: () => {
      console.log('🔍 Fetching services with params:', {
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        is_active: showActiveOnly ? true : undefined
      })
      return servicesAPI.getServices({
        page: 1,
        per_page: 100,
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        is_active: showActiveOnly ? true : undefined
      })
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  })

  const services = (servicesResponse as any)?.services || []
  
  // Debug: Log services data when it changes
  React.useEffect(() => {
    console.log('📊 Services query success, received:', services.length, 'services')
    if (services.length > 0) {
      console.log('📋 Service names:', services.map((s: any) => s.name))
    }
  }, [services])
  
  React.useEffect(() => {
    if (error) {
      console.error('❌ Services query error:', error)
    }
  }, [error])

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: (serviceData: ServiceFormData) => {
      console.log('Creating service with data:', serviceData)
      return servicesAPI.createService(serviceData)
    },
    onSuccess: (data) => {
      console.log('✅ Service created successfully:', data)
      console.log('🔄 Current query cache keys before invalidation:')
      queryClient.getQueryCache().getAll().forEach(query => {
        if (query.queryKey[0] === 'services') {
          console.log('  - Services query key:', query.queryKey)
        }
      })
      
      console.log('🚮 Invalidating services queries...')
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const isServicesQuery = query.queryKey[0] === "services"
          if (isServicesQuery) {
            console.log('  - Invalidating:', query.queryKey)
          }
          return isServicesQuery
        }
      })
      
      console.log('🚮 Invalidating dashboard stats...')
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      
      console.log('📋 Closing form and resetting...')
      setShowForm(false)
      toast.success('Service created successfully!')
      resetForm()
      
      // Force a manual refetch as backup
      console.log('🔄 Manual refetch as backup...')
      setTimeout(() => {
        queryClient.refetchQueries({ 
          predicate: (query) => query.queryKey[0] === "services" 
        })
      }, 100)
      
      // Additional backup: Clear the cache entirely for services
      setTimeout(() => {
        console.log('🗑️ Clearing services cache entirely as final backup...')
        queryClient.removeQueries({ 
          predicate: (query) => query.queryKey[0] === "services" 
        })
      }, 200)
    },
    onError: (error: any) => {
      console.error('Create service error:', error)
      toast.error(error.message || 'Failed to create service')
    }
  })

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: ({ id, ...serviceData }: ServiceFormData & { id: number }) => 
      servicesAPI.updateService(id, serviceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "services" 
      })
      toast.success('Service updated successfully!')
      resetForm()
    },
    onError: (error: any) => {
      toast.error('Failed to update service')
      console.error('Update service error:', error)
    }
  })

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: (serviceId: number) => servicesAPI.deleteService(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "services" 
      })
      toast.success('Service deleted successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to delete service')
      console.error('Delete service error:', error)
    }
  })

  // Filter services
  const filteredServices = services?.filter((service: Service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProvider = !selectedProvider || service.provider_id === selectedProvider
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
    const matchesActiveFilter = !showActiveOnly || service.is_active
    return matchesSearch && matchesProvider && matchesCategory && matchesActiveFilter
  }) || []

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      provider_id: service.provider_id,
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      category: service.category,
      is_active: service.is_active,
      max_advance_booking_days: service.max_advance_booking_days || 30,
      buffer_time_before: service.buffer_time_before || 0,
      buffer_time_after: service.buffer_time_after || 0
    })
    setShowForm(true)
  }

  const handleDelete = (serviceId: number) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      deleteServiceMutation.mutate(serviceId)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingService) {
      updateServiceMutation.mutate({ ...formData, id: editingService.id })
    } else {
      createServiceMutation.mutate(formData)
    }
  }

  const resetForm = () => {
    setFormData({
      provider_id: null,
      name: '',
      description: '',
      duration: 30,
      price: 0,
      category: 'Consultation',
      is_active: true,
      max_advance_booking_days: 30,
      buffer_time_before: 0,
      buffer_time_after: 0
    })
    setShowForm(false)
    setEditingService(null)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
    }
    return `${minutes}m`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">{t('services.loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={cn(getFlexDirection("flex items-center gap-4"))}>
          <Briefcase className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">{t('services.title')}</h1>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              console.log('🔍 DEBUG: Current services state:', {
                totalServices: services.length,
                servicesData: services,
                filters: { searchTerm, selectedCategory, showActiveOnly },
                queryState: { isLoading, error }
              })
              queryClient.refetchQueries({ 
                predicate: (query) => query.queryKey[0] === "services" 
              })
            }}
          >
            {t('services.debugRefresh')}
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {t('services.add')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn(getFlexDirection("flex flex-col md:flex-row gap-4"))}>
            <div className="flex-1">
              <div className="relative">
                <Search 
                  className="absolute top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" 
                  style={{ 
                    [isRTL ? 'right' : 'left']: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }} 
                />
                <Input
                  type="text"
                  placeholder={t('services.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(isRTL ? "pr-9" : "pl-10")}
                  dir={isRTL ? "rtl" : "ltr"}
                />
              </div>
            </div>
            
            <select
              value={selectedProvider || ''}
              onChange={(e) => setSelectedProvider(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('services.allProviders')}</option>
              {providers?.map((provider: Provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.business_name}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">{t('services.allCategories')}</option>
              {SERVICE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>{t('services.activeOnly')}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.length > 0 ? (
          filteredServices.map((service: Service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`h-full ${!service.is_active ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {service.provider?.business_name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      {service.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {service.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{formatDuration(service.duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>{formatPrice(service.price)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded-full">
                      {service.category}
                    </span>
                  </div>

                  {(service.buffer_time_before || service.buffer_time_after) && (
                    <div className="text-xs text-gray-500">
                      Buffer: {service.buffer_time_before || 0}m before, {service.buffer_time_after || 0}m after
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('services.noServicesFound')}</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedProvider || selectedCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first service'
              }
            </p>
            {!searchTerm && !selectedProvider && selectedCategory === 'all' && (
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Service
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h3>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                ×
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider (optional)
                </label>
                <select
                  value={formData.provider_id || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    provider_id: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('services.allProvidersOrgWide')}</option>
                  {providers?.map((provider: Provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.business_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('services.name')} *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('placeholders.serviceName')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    {SERVICE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('services.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={t('placeholders.serviceDescription')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes) *
                  </label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                    min="5"
                    max="480"
                    step="5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price ($) *
                  </label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Advance Booking (days)
                  </label>
                  <Input
                    type="number"
                    value={formData.max_advance_booking_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_advance_booking_days: parseInt(e.target.value) || 30 }))}
                    min="1"
                    max="365"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buffer Before (min)
                  </label>
                  <Input
                    type="number"
                    value={formData.buffer_time_before}
                    onChange={(e) => setFormData(prev => ({ ...prev, buffer_time_before: parseInt(e.target.value) || 0 }))}
                    min="0"
                    max="60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buffer After (min)
                  </label>
                  <Input
                    type="number"
                    value={formData.buffer_time_after}
                    onChange={(e) => setFormData(prev => ({ ...prev, buffer_time_after: parseInt(e.target.value) || 0 }))}
                    min="0"
                    max="60"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Service is active and available for booking
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                >
                  {editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className={cn(getFlexDirection("flex items-center gap-2"))}>
              <Briefcase className="h-5 w-5 text-blue-600" />
              <div>
                                  <p className="text-sm text-gray-600">{t('services.totalServices')}</p>
                <p className="text-2xl font-bold">{services?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className={cn(getFlexDirection("flex items-center gap-2"))}>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                                  <p className="text-sm text-gray-600">{t('services.activeServices')}</p>
                <p className="text-2xl font-bold">
                  {services?.filter((s: any) => s.is_active).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className={cn(getFlexDirection("flex items-center gap-2"))}>
              <Tag className="h-5 w-5 text-purple-600" />
              <div>
                                  <p className="text-sm text-gray-600">{t('services.categories')}</p>
                <p className="text-2xl font-bold">
                  {new Set(services?.map((s: any) => s.category)).size || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className={cn(getFlexDirection("flex items-center gap-2"))}>
              <DollarSign className="h-5 w-5 text-orange-600" />
              <div>
                                  <p className="text-sm text-gray-600">{t('services.avgPrice')}</p>
                <p className="text-2xl font-bold">
                  {services?.length ? 
                    formatPrice(services.reduce((sum: number, s: any) => sum + s.price, 0) / services.length) : 
                    '$0'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Services
