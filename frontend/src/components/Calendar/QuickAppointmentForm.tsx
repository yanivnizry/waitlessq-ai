import React, { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Clock,
  User,
  Phone,
  X,
  Zap,

  Calendar,
  Save
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { api } from '../../lib/api-client'
import { servicesAPI } from '../../services/api'
import { toast } from 'sonner'
import { useGamificationStore } from '../../store/gamification-store'
import TimeSlotPicker from '../ui/TimeSlotPicker'
import moment from 'moment'

interface Provider {
  id: number
  business_name: string
}

interface QuickAppointmentFormProps {
  selectedSlot: { start: Date; end: Date }
  providers: Provider[]
  onClose: () => void
  onSuccess: () => void
}



const QuickAppointmentForm: React.FC<QuickAppointmentFormProps> = ({
  selectedSlot,
  providers,
  onClose,
  onSuccess
}) => {
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedDateTime, setSelectedDateTime] = useState('')

  const queryClient = useQueryClient()
  const { addPoints, addNewClient, addRevenue } = useGamificationStore()

  // Fetch available services
  const { data: servicesResponse } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesAPI.getServices({ is_active: true }),
    staleTime: 5 * 60 * 1000
  })

  const services = servicesResponse?.services || []

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (appointmentData: any) => api.appointments.create(appointmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
      
      // Gamification: Award points
      addPoints(20, 'scheduling appointment')
      addNewClient()
      if (selectedService?.price > 0) {
        addRevenue(selectedService.price)
      }
      
      toast.success('🎉 Appointment created! +20 points earned!')
      onSuccess()
      onClose()
    },
    onError: (error: any) => {
      console.error('Failed to create appointment:', error)
      toast.error('Failed to create appointment. Please try again.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim()) {
      toast.error('Client name is required')
      return
    }

    if (!selectedService) {
      toast.error('Please select a service')
      return
    }

    if (!selectedDateTime) {
      toast.error('Please select a time slot')
      return
    }
    
    const appointmentData = {
      provider_id: providers[0]?.id || 1,
      client_name: clientName.trim(),
      client_email: `${clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`, // Auto-generate
      client_phone: clientPhone || 'Not provided',
      service_name: selectedService.name,
      service_description: selectedService.description || selectedService.name,
      scheduled_time: selectedDateTime,
      duration: selectedService.duration,
      status: 'scheduled',
      notes: '',
      special_requests: ''
    }

    createAppointmentMutation.mutate(appointmentData)
  }

  const handleServiceSelect = (service: any) => {
    setSelectedService(service)
  }

  const handleTimeSelect = (time: string, datetime: string) => {
    setSelectedTime(time)
    setSelectedDateTime(datetime)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <span>Quick Appointment</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{moment(selectedSlot.start).format('MMM DD, YYYY')}</span>
            <Clock className="h-4 w-4 ml-2" />
            <span>{moment(selectedSlot.start).format('h:mm A')}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client Name - REQUIRED */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Client Name *</span>
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                className="text-lg"
                autoFocus
                required
              />
            </div>

            {/* Client Phone - OPTIONAL */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Phone (optional)</span>
              </label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Phone number"
                type="tel"
              />
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Service</label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {services.map((service) => (
                  <Button
                    key={service.id}
                    type="button"
                    variant={selectedService?.id === service.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleServiceSelect(service)}
                    className="text-xs h-auto py-3 px-3 justify-start"
                  >
                    <div className="text-left w-full">
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs opacity-70">
                        {service.duration}min • ${service.price}
                        {service.category && ` • ${service.category}`}
                      </div>
                      {service.description && (
                        <div className="text-xs opacity-60 mt-1 truncate">
                          {service.description}
                        </div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
              
              {services.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No services available. Please create services first.
                </div>
              )}
            </div>

            {/* Time Slot Selection */}
            {providers && providers.length > 0 && (
              <div className="space-y-2">
                <TimeSlotPicker
                  providerId={providers[0].id}
                  selectedDate={selectedSlot.start}
                  selectedTime={selectedTime}
                  onTimeSelect={handleTimeSelect}
                  className="border-0 shadow-none p-0"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending || !clientName.trim() || !selectedService || !selectedDateTime}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {createAppointmentMutation.isPending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                  </motion.div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {createAppointmentMutation.isPending ? 'Creating...' : 'Create Appointment'}
              </Button>
            </div>
          </form>

          {/* Quick Stats */}
          {selectedService && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{selectedService.duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-medium">${selectedService.price}</span>
                </div>
                {selectedTime && (
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Points to earn:</span>
                  <span className="font-medium text-blue-600">
                    +{20 + 15 + Math.floor(selectedService.price / 10)} points
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default QuickAppointmentForm
