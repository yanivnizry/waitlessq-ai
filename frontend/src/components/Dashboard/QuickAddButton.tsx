import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
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
import { toast } from 'sonner'
import { useGamificationStore } from '../../store/gamification-store'

// Ultra-minimal preset services
const QUICK_SERVICES = [
  { name: 'Appointment', duration: 30, price: 50 },
  { name: 'Consultation', duration: 45, price: 75 },
  { name: 'Follow-up', duration: 15, price: 25 }
]

const QuickAddButton: React.FC = () => {
  const [showForm, setShowForm] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [selectedService, setSelectedService] = useState(QUICK_SERVICES[0])
  const [appointmentTime, setAppointmentTime] = useState(() => {
    // Default to next hour
    const now = new Date()
    now.setHours(now.getHours() + 1)
    now.setMinutes(0)
    now.setSeconds(0)
    now.setMilliseconds(0)
    return now.toISOString().slice(0, 16) // Format for datetime-local input
  })

  const queryClient = useQueryClient()
  const { addPoints, addNewClient, addRevenue } = useGamificationStore()

  // Get providers
  const providersQuery = useQuery({
    queryKey: ['providers'],
    queryFn: () => api.providers.getAll(),
    staleTime: 5 * 60 * 1000,
    retry: false
  })

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (appointmentData: any) => api.appointments.create(appointmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
      
      // Gamification
      addPoints(20, 'quick appointment')
      addNewClient()
      if (selectedService.price > 0) {
        addRevenue(selectedService.price)
      }
      
      toast.success(`🎉 ${selectedService.name} scheduled! +${20 + 15 + Math.floor(selectedService.price / 10)} points!`)
      
      // Reset form
      setClientName('')
      setClientPhone('')
      setShowForm(false)
    },
    onError: (error: any) => {
      console.error('Failed to create appointment:', error)
      toast.error('Failed to create appointment')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim()) {
      toast.error('Client name is required')
      return
    }

    const providers = providersQuery.data || []
    if (providers.length === 0) {
      toast.error('No providers available')
      return
    }

    const appointmentData = {
      provider_id: providers[0].id,
      client_name: clientName.trim(),
      client_email: `${clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      client_phone: clientPhone || 'Not provided',
      service_name: selectedService.name,
      service_description: selectedService.name,
      scheduled_time: new Date(appointmentTime).toISOString(),
      duration: selectedService.duration,
      status: 'scheduled',
      notes: '',
      special_requests: ''
    }

    createAppointmentMutation.mutate(appointmentData)
  }

  return (
    <>
      {/* Quick Add Button */}
      <Button
        onClick={() => setShowForm(true)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
        size="lg"
      >
        <Plus className="h-5 w-5 mr-2" />
        Quick Add
      </Button>

      {/* Ultra-Simple Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
            >
              <Card className="w-full max-w-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <span>Quick Appointment</span>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Client Name */}
                    <div>
                      <Input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Client name"
                        className="text-lg h-12"
                        autoFocus
                        required
                      />
                    </div>

                    {/* Phone (optional) */}
                    <div>
                      <Input
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="Phone (optional)"
                        type="tel"
                      />
                    </div>

                    {/* Quick Service Selection */}
                    <div className="grid grid-cols-3 gap-2">
                      {QUICK_SERVICES.map((service, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant={selectedService === service ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedService(service)}
                          className="h-auto py-3 px-2"
                        >
                          <div className="text-center">
                            <div className="text-xs font-medium">{service.name}</div>
                            <div className="text-xs opacity-70">{service.duration}min</div>
                            <div className="text-xs opacity-70">${service.price}</div>
                          </div>
                        </Button>
                      ))}
                    </div>

                    {/* Date/Time */}
                    <div>
                      <input
                        type="datetime-local"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createAppointmentMutation.isPending || !clientName.trim()}
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
                        {createAppointmentMutation.isPending ? 'Adding...' : 'Add'}
                      </Button>
                    </div>

                    {/* Quick Preview */}
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Service:</span>
                        <span className="font-medium">{selectedService.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Points to earn:</span>
                        <span className="font-medium text-blue-600">
                          +{20 + 15 + Math.floor(selectedService.price / 10)}
                        </span>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default QuickAddButton
