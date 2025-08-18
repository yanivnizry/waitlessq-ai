import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Clock,
  X,
  Zap,
  Save
} from 'lucide-react'
import { Button } from '../ui/button'
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
  const [selectedClient, setSelectedClient] = useState<any>(null)
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

  // Get clients for selection
  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.clients.getAll({ is_active: true }),
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
      setSelectedClient(null)
      setShowForm(false)
    },
    onError: (error: any) => {
      console.error('Failed to create appointment:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      
      if (error.response?.data?.detail) {
        toast.error(`Failed to create appointment: ${error.response.data.detail}`)
      } else if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.')
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to create appointments.')
      } else {
        toast.error('Failed to create appointment. Please try again.')
      }
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClient) {
      toast.error('Please select a client')
      return
    }

    console.log('🏥 Providers query status:', {
      isLoading: providersQuery.isLoading,
      isError: providersQuery.isError,
      error: providersQuery.error,
      data: providersQuery.data
    })

    console.log('👥 Clients query status:', {
      isLoading: clientsQuery.isLoading,
      isError: clientsQuery.isError,
      error: clientsQuery.error,
      data: clientsQuery.data,
      selectedClient: selectedClient
    })

    const providers = providersQuery.data || []
    if (providers.length === 0) {
      if (providersQuery.isLoading) {
        toast.error('Loading providers... Please wait.')
        return
      } else if (providersQuery.isError) {
        toast.error('Failed to load providers. Please refresh and try again.')
        return
      } else {
        toast.error('No providers available. Please create a provider first.')
        return
      }
    }

    const appointmentData = {
      provider_id: providers[0].id,
      client_name: selectedClient.name,
      client_email: selectedClient.email || `${selectedClient.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      client_phone: selectedClient.phone || 'Not provided',
      service_name: selectedService.name,
      service_description: selectedService.name,
      scheduled_at: new Date(appointmentTime).toISOString(),
      duration: selectedService.duration,
      status: 'scheduled',
      notes: '',
      special_requests: ''
    }

    console.log('🚀 Creating appointment with data:', appointmentData)
    console.log('🚀 Selected provider:', providers[0])
    console.log('🚀 Appointment time:', appointmentTime, '→', new Date(appointmentTime).toISOString())

    createAppointmentMutation.mutate(appointmentData)
  }

  return (
    <>
      {/* Quick Add Button */}
      <Button
        onClick={() => setShowForm(true)}
        className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
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
              <Card className="w-full max-w-md card-hover bg-gradient-to-br from-card to-card/50 border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <span>Quick Appointment</span>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Client Selection */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Select Client *
                      </label>
                      <select
                        value={selectedClient?.id || ''}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === 'new') {
                            // Redirect to clients page or show create client form
                            toast.info('Please go to Clients page to add a new client first')
                            return
                          }
                          const clientId = parseInt(value)
                          const client = clientsQuery.data?.find((c: any) => c.id === clientId)
                          setSelectedClient(client || null)
                        }}
                        className="w-full px-4 py-3 text-lg border-2 border-muted focus:border-primary/50 rounded-xl bg-background text-foreground transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      >
                        <option value="">Choose a client...</option>
                        {clientsQuery.data?.map((client: any) => (
                          <option key={client.id} value={client.id}>
                            {client.name} {client.phone ? `(${client.phone})` : ''}
                          </option>
                        ))}
                        <option value="new" className="font-medium text-primary">
                          ➕ Add New Client
                        </option>
                      </select>
                      
                      {clientsQuery.isLoading && (
                        <p className="text-xs text-muted-foreground mt-1">Loading clients...</p>
                      )}
                      
                      {clientsQuery.isError && (
                        <p className="text-xs text-destructive mt-1">Failed to load clients</p>
                      )}
                      
                      {!clientsQuery.isLoading && !clientsQuery.isError && (!clientsQuery.data || clientsQuery.data.length === 0) && (
                        <p className="text-xs text-muted-foreground mt-1">No clients found. Create some clients first.</p>
                      )}
                      
                      {selectedClient && (
                        <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <p className="text-sm font-medium">{selectedClient.name}</p>
                          {selectedClient.email && (
                            <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
                          )}
                          {selectedClient.phone && (
                            <p className="text-xs text-muted-foreground">{selectedClient.phone}</p>
                          )}
                        </div>
                      )}
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
                        disabled={createAppointmentMutation.isPending || !selectedClient}
                        className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
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
