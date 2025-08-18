import React, { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  CalendarIcon, 
  Clock, 
  User, 
  Phone,
  Mail,
  FileText,
  Save,
  X,
  ChevronDown
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent } from '../ui/card'
import { api } from '../../lib/api-client'
import { servicesAPI } from '../../services/api'
import { toast } from 'sonner'
import { useGamificationStore } from '../../store/gamification-store'
import moment from 'moment'

interface Provider {
  id: number
  business_name: string
}

interface AppointmentFormProps {
  selectedSlot: { start: Date; end: Date }
  providers: Provider[]
  onClose: () => void
  onSuccess: () => void
}

interface AppointmentFormData {
  provider_id: number
  client_name: string
  client_email: string
  client_phone: string
  service_id: number | null
  service_name: string
  service_description: string
  duration: number
  price: number
  notes: string
  special_requests: string
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  selectedSlot,
  providers,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    provider_id: providers?.[0]?.id || 0,
    client_name: '',
    client_email: '',
    client_phone: '',
    service_id: null,
    service_name: '',
    service_description: '',
    duration: 30,
    price: 0,
    notes: '',
    special_requests: ''
  })

  const [errors, setErrors] = useState<Partial<AppointmentFormData>>({})
  const queryClient = useQueryClient()
  const { addPoints, addNewClient, addRevenue } = useGamificationStore()

  // Fetch services
  const { data: servicesResponse } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesAPI.getServices({ page: 1, per_page: 100 }),
    staleTime: 5 * 60 * 1000,
    retry: false
  })
  const services = servicesResponse?.services || []

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (appointmentData: any) => api.appointments.create(appointmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
      
      // Gamification: Award points for creating appointment
      addPoints(20, 'scheduling appointment')
      addNewClient() // This will also add points for new client
      if (formData.price > 0) {
        addRevenue(formData.price)
      }
      
      toast.success('🎉 Appointment created! +20 points earned!')
      onSuccess()
      onClose()
    },
    onError: (error: any) => {
      console.error('Failed to create appointment:', error)
      // Handle error display
    }
  })

  const handleInputChange = (field: keyof AppointmentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleServiceSelect = (serviceId: number) => {
    const selectedService = services.find((s: any) => s.id === serviceId)
    if (selectedService) {
      setFormData(prev => ({
        ...prev,
        service_id: serviceId,
        service_name: selectedService.name,
        service_description: selectedService.description || '',
        duration: selectedService.duration || 30,
        price: selectedService.price || 0
      }))
      
      // Clear service error
      if (errors.service_name) {
        setErrors(prev => ({
          ...prev,
          service_name: undefined
        }))
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<AppointmentFormData> = {}

    if (!formData.provider_id) newErrors.provider_id = 0 // Will show as error
    if (!formData.client_name.trim()) newErrors.client_name = 'Client name is required'
    if (!formData.service_id) newErrors.service_name = 'Service is required'
    if (formData.duration < 15) newErrors.duration = 15 // Minimum duration
    
    // Email validation (if provided)
    if (formData.client_email && !/\S+@\S+\.\S+/.test(formData.client_email)) {
      newErrors.client_email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Calculate end time based on duration
    const endTime = new Date(selectedSlot.start.getTime() + formData.duration * 60000)

    const appointmentData = {
      ...formData,
      scheduled_at: selectedSlot.start.toISOString(),
      end_time: endTime.toISOString(),
      status: 'scheduled'
    }

    createAppointmentMutation.mutate(appointmentData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold">New Appointment</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Selected Time Display */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  {moment(selectedSlot.start).format('MMMM Do, YYYY')}
                </p>
                <p className="text-sm text-blue-700">
                  {moment(selectedSlot.start).format('h:mm A')} - {moment(selectedSlot.end).format('h:mm A')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider *
            </label>
            <select
              value={formData.provider_id}
              onChange={(e) => handleInputChange('provider_id', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value={0}>Select a provider</option>
              {providers?.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.business_name}
                </option>
              ))}
            </select>
          </div>

          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Client Name *
              </label>
              <Input
                type="text"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                className={errors.client_name ? 'border-red-500' : ''}
                placeholder="Enter client name"
                required
              />
              {errors.client_name && (
                <p className="text-sm text-red-600 mt-1">{errors.client_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.client_phone}
                onChange={(e) => handleInputChange('client_phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-1" />
              Email Address
            </label>
            <Input
              type="email"
              value={formData.client_email}
              onChange={(e) => handleInputChange('client_email', e.target.value)}
              className={errors.client_email ? 'border-red-500' : ''}
              placeholder="Enter email address"
            />
            {errors.client_email && (
              <p className="text-sm text-red-600 mt-1">{errors.client_email}</p>
            )}
          </div>

          {/* Service Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service *
              </label>
              <div className="relative">
                <select
                  value={formData.service_id || ''}
                  onChange={(e) => handleServiceSelect(Number(e.target.value))}
                  className={`w-full h-10 px-3 py-2 text-sm bg-background border rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8 ${
                    errors.service_name ? 'border-red-500' : 'border-input'
                  }`}
                  required
                >
                  <option value="">Select a service...</option>
                  {services.map((service: any) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - ${service.price} ({service.duration}min)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.service_name && (
                <p className="text-sm text-red-600 mt-1">{errors.service_name}</p>
              )}
              {formData.service_id && (
                <p className="text-xs text-gray-500 mt-1">
                  {services.find((s: any) => s.id === formData.service_id)?.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Duration (minutes) *
              </label>
              <Input
                type="number"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 30)}
                min="15"
                max="480"
                step="15"
                className={errors.duration ? 'border-red-500' : ''}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Description
            </label>
            <textarea
              value={formData.service_description}
              onChange={(e) => handleInputChange('service_description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the service or treatment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Special Requests
            </label>
            <textarea
              value={formData.special_requests}
              onChange={(e) => handleInputChange('special_requests', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any special requests or notes from the client"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Internal notes (not visible to client)"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createAppointmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAppointmentMutation.isPending}
              className="flex items-center space-x-2"
            >
              {createAppointmentMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Create Appointment</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default AppointmentForm
