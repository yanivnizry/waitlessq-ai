import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  UserPlus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  Search,
  ChevronDown
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { api } from '../../lib/api-client'
import { servicesAPI, clientsAPI } from '../../services/api'
import { cn } from '../../lib/utils'
import TimeSlotPicker from '../ui/TimeSlotPicker'

// Types based on backend schemas
interface Appointment {
  id: number
  provider_id: number
  client_name: string
  client_email?: string
  client_phone?: string
  service_name: string
  service_description?: string
  duration: number
  scheduled_at: string
  end_time?: string
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  internal_notes?: string
  client_notes?: string
  special_requests?: string
  created_at: string
  updated_at?: string
  confirmed_at?: string
  completed_at?: string
}

interface AppointmentFormData {
  provider_id: number
  client_id: number | null
  client_name: string
  client_email: string
  client_phone: string
  service_id: number | null
  service_name: string
  service_description: string
  duration: number
  scheduled_at: string
  notes: string
  client_notes: string
  special_requests: string
}

interface Provider {
  id: number
  business_name: string
}

// Client creation form data interface
interface ClientFormData {
  name: string
  email: string
  phone: string
  date_of_birth: string
  address: string
  emergency_contact: string
  emergency_phone: string
  medical_conditions: string
  allergies: string
  notes: string
  preferred_communication: 'email' | 'phone' | 'sms'
  marketing_consent: boolean
}

export function Appointments() {
  const [showForm, setShowForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedDateTime, setSelectedDateTime] = useState<string>('')
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientFormData, setClientFormData] = useState<ClientFormData>({
    name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    medical_conditions: "",
    allergies: "",
    notes: "",
    preferred_communication: 'email',
    marketing_consent: false,
  })
  const [formData, setFormData] = useState<AppointmentFormData>({
    provider_id: 0,
    client_id: null,
    client_name: "",
    client_email: "",
    client_phone: "",
    service_id: null,
    service_name: "",
    service_description: "",
    duration: 30,
    scheduled_at: "",
    notes: "",
    client_notes: "",
    special_requests: "",
  })

  const queryClient = useQueryClient()

  // Fetch appointments
  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.appointments.getAll(),
  })

  // Fetch providers for the form
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.providers.getAll(),
  })

  // Fetch services
  const { data: servicesResponse } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesAPI.getServices({ page: 1, per_page: 100 }),
    staleTime: 5 * 60 * 1000,
    retry: false
  })
  const services = servicesResponse?.services || []

  // Fetch clients summary for selection
  const { data: clientsSummary } = useQuery({
    queryKey: ["clients-summary"],
    queryFn: () => clientsAPI.getClientsSummary({ limit: 200 }),
    staleTime: 2 * 60 * 1000,
    retry: false
  })
  const clients = clientsSummary || []

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (appointmentData: any) => api.appointments.create(appointmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
      setShowForm(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error("Failed to create appointment:", error)
    },
  })

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, ...appointmentData }: any) => api.appointments.update(id, appointmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
      setShowForm(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error("Failed to update appointment:", error)
    },
  })

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: number) => api.appointments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
    },
    onError: (error: any) => {
      console.error("Failed to delete appointment:", error)
    },
  })

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: (clientData: any) => clientsAPI.createClient(clientData),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["clients-summary"] })
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setShowClientModal(false)
      resetClientForm()
      // Auto-select the newly created client
      setFormData(prev => ({
        ...prev,
        client_id: newClient.id,
        client_name: newClient.name,
        client_email: newClient.email || "",
        client_phone: newClient.phone || "",
      }))
    },
    onError: (error: any) => {
      console.error("Failed to create client:", error)
    },
  })

  // Confirm appointment mutation
  const confirmAppointmentMutation = useMutation({
    mutationFn: (id: number) => api.appointments.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: (id: number) => api.appointments.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const appointmentData = {
      ...formData,
      scheduled_at: new Date(formData.scheduled_at).toISOString(),
    }

    if (editingAppointment) {
      updateAppointmentMutation.mutate({ id: editingAppointment.id, ...appointmentData })
    } else {
      createAppointmentMutation.mutate(appointmentData)
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
        duration: selectedService.duration || 30
      }))
    }
  }

  const handleClientSelect = (clientId: number) => {
    const selectedClient = clients.find((c: any) => c.id === clientId)
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        client_name: selectedClient.name,
        client_email: selectedClient.email || '',
        client_phone: selectedClient.phone || ''
      }))
    }
  }

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    
    // Find matching client from clients
    const matchingClient = clients.find((client: any) => 
      client.name === appointment.client_name || 
      client.email === appointment.client_email ||
      client.phone === appointment.client_phone
    )
    
    // Find matching service from services
    const matchingService = services.find((service: any) => 
      service.name === appointment.service_name
    )
    
    // Parse the scheduled_at date for form inputs
    console.log('Original appointment.scheduled_at:', appointment.scheduled_at, typeof appointment.scheduled_at)
    
    // More robust date parsing
    let appointmentDate: Date
    let dateString: string
    let timeString: string
    let dateTimeString: string
    
    try {
      // Try different parsing approaches
      if (typeof appointment.scheduled_at === 'string') {
        // Ensure the string is in ISO format
        let dateStr = appointment.scheduled_at
        
        // If it doesn't contain 'T', it might be in a different format
        if (!dateStr.includes('T') && dateStr.includes(' ')) {
          dateStr = dateStr.replace(' ', 'T')
        }
        
        // If it doesn't end with Z or timezone info, add Z for UTC
        if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
          dateStr += 'Z'
        }
        
        appointmentDate = new Date(dateStr)
      } else {
        appointmentDate = new Date(appointment.scheduled_at)
      }
      
      console.log('Parsed appointmentDate:', appointmentDate)
      console.log('Year:', appointmentDate.getFullYear())
      
      // Validate the parsed date
      if (isNaN(appointmentDate.getTime()) || appointmentDate.getFullYear() < 1970 || appointmentDate.getFullYear() > 2100) {
        throw new Error('Invalid date range')
      }
      
      // Extract date and time components
      dateString = appointmentDate.toISOString().split('T')[0] // YYYY-MM-DD
      timeString = appointmentDate.toTimeString().slice(0, 5) // HH:MM
      dateTimeString = appointmentDate.toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
      
    } catch (error) {
      console.error('Failed to parse appointment date:', appointment.scheduled_at, error)
      // Use current date as fallback
      const fallbackDate = new Date()
      dateString = fallbackDate.toISOString().split('T')[0]
      timeString = '09:00' // Default time
      dateTimeString = `${dateString}T${timeString}`
    }
    
    console.log('Final values - dateString:', dateString, 'timeString:', timeString)
    
    setFormData({
      provider_id: appointment.provider_id,
      client_id: matchingClient?.id || null,
      client_name: appointment.client_name,
      client_email: appointment.client_email || "",
      client_phone: appointment.client_phone || "",
      service_id: matchingService?.id || null,
      service_name: appointment.service_name,
      service_description: appointment.service_description || "",
      duration: appointment.duration,
      scheduled_at: dateTimeString,
      notes: appointment.notes || "",
      client_notes: appointment.client_notes || "",
      special_requests: appointment.special_requests || "",
    })
    
    // Set the date and time for the TimeSlotPicker
    setSelectedDate(dateString)
    setSelectedDateTime(timeString)
    
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      deleteAppointmentMutation.mutate(id)
    }
  }

  const resetForm = () => {
    setFormData({
      provider_id: 0,
      client_id: null,
      client_name: "",
      client_email: "",
      client_phone: "",
      service_id: null,
      service_name: "",
      service_description: "",
      duration: 30,
      scheduled_at: "",
      notes: "",
      client_notes: "",
      special_requests: "",
    })
    setSelectedDate('')
    setSelectedDateTime('')
    setShowForm(false)
    setEditingAppointment(null)
  }

  const resetClientForm = () => {
    setClientFormData({
      name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      address: "",
      emergency_contact: "",
      emergency_phone: "",
      medical_conditions: "",
      allergies: "",
      notes: "",
      preferred_communication: 'email',
      marketing_consent: false,
    })
  }

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createClientMutation.mutate(clientFormData)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500'
      case 'scheduled': return 'bg-blue-500'
      case 'in_progress': return 'bg-yellow-500'
      case 'completed': return 'bg-gray-500'
      case 'cancelled': return 'bg-red-500'
      case 'no_show': return 'bg-orange-500'
      default: return 'bg-gray-400'
    }
  }

  const filteredAppointments = appointments?.filter((appointment: Appointment) => {
    const matchesSearch = appointment.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.service_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Manage client appointments and scheduling.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Appointment
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Add/Edit Appointment Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {editingAppointment ? "Edit Appointment" : "Add New Appointment"}
              </CardTitle>
              <CardDescription>
                {editingAppointment
                  ? "Update appointment details"
                  : "Schedule a new appointment for a client"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Provider *</label>
                    <select
                      value={formData.provider_id}
                      onChange={(e) =>
                        setFormData({ ...formData, provider_id: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={0}>Select a provider</option>
                      {providers?.map((provider: Provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.business_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Client *</label>
                    <div className="relative">
                      <select
                        value={formData.client_id || ''}
                        onChange={(e) => handleClientSelect(Number(e.target.value))}
                        className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8"
                        required
                      >
                        <option value="">Select a client...</option>
                        {clients.map((client: any) => (
                          <option key={client.id} value={client.id}>
                            {client.name} {client.email ? `(${client.email})` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    {formData.client_id && (
                      <div className="mt-2 text-xs text-gray-600 space-y-1">
                        <p><strong>Name:</strong> {formData.client_name}</p>
                        {formData.client_email && <p><strong>Email:</strong> {formData.client_email}</p>}
                        {formData.client_phone && <p><strong>Phone:</strong> {formData.client_phone}</p>}
                      </div>
                    )}
                    
                    {/* Quick Add New Client Button */}
                    <div className="mt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowClientModal(true)}
                      >
                        + Add New Client
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Service *</label>
                    <div className="relative">
                      <select
                        value={formData.service_id || ''}
                        onChange={(e) => handleServiceSelect(Number(e.target.value))}
                        className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8"
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
                    {formData.service_id && (
                      <p className="text-xs text-gray-500 mt-1">
                        {services.find((s: any) => s.id === formData.service_id)?.description}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duration (minutes) *</label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({ ...formData, duration: parseInt(e.target.value) })
                      }
                      placeholder="30"
                      min={15}
                      max={480}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Scheduled Date & Time *</label>
                    <div className="space-y-3">
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full"
                        required
                      />
                      
                      {selectedDate && formData.provider_id && (
                        <TimeSlotPicker
                          providerId={formData.provider_id}
                          selectedDate={new Date(selectedDate)}
                          selectedTime={selectedDateTime}
                          onTimeSelect={(time: string, datetime: string) => {
                            console.log('TimeSlotPicker onTimeSelect called:', { time, datetime })
                            console.log('Current showForm state:', showForm)
                            console.log('Current editingAppointment:', editingAppointment?.id)
                            
                            setSelectedDateTime(time)
                            setFormData(prev => {
                              console.log('Updating formData, prev:', prev)
                              const updated = { ...prev, scheduled_at: datetime }
                              console.log('Updated formData:', updated)
                              return updated
                            })
                            
                            console.log('After state updates, showForm should still be:', showForm)
                          }}
                        />
                      )}
                      
                      {selectedDateTime && selectedDate && (
                        <p className="text-sm text-green-600">
                          ✓ Selected: {new Date(`${selectedDate}T${selectedDateTime}`).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Service Description</label>
                    <textarea
                      className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.service_description}
                      onChange={(e) =>
                        setFormData({ ...formData, service_description: e.target.value })
                      }
                      placeholder="Describe the service..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Internal Notes</label>
                    <textarea
                      className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Internal notes (not visible to client)..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Special Requests</label>
                    <textarea
                      className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.special_requests}
                      onChange={(e) =>
                        setFormData({ ...formData, special_requests: e.target.value })
                      }
                      placeholder="Any special requests from client..."
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={
                      createAppointmentMutation.isPending ||
                      updateAppointmentMutation.isPending
                    }
                  >
                    {createAppointmentMutation.isPending ||
                    updateAppointmentMutation.isPending
                      ? "Saving..."
                      : editingAppointment
                      ? "Update Appointment"
                      : "Create Appointment"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancel
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
          <p className="text-sm text-muted-foreground mt-2">Loading appointments...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">
              Failed to load appointments. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!appointments || appointments.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No appointments yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by scheduling your first appointment.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Schedule First Appointment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Appointments List */}
      {filteredAppointments && filteredAppointments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAppointments.map((appointment: Appointment, index: number) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {appointment.client_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            getStatusColor(appointment.status)
                          )}
                        />
                        <span className="text-sm text-muted-foreground capitalize">
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {appointment.status === 'scheduled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmAppointmentMutation.mutate(appointment.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(appointment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelAppointmentMutation.mutate(appointment.id)}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(appointment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(appointment.scheduled_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {new Date(appointment.scheduled_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} ({appointment.duration} min)
                      </span>
                    </div>
                    {appointment.client_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{appointment.client_phone}</span>
                      </div>
                    )}
                    {appointment.client_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{appointment.client_email}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t">
                    <h4 className="font-medium text-sm">{appointment.service_name}</h4>
                    {appointment.service_description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {appointment.service_description}
                      </p>
                    )}
                    {appointment.special_requests && (
                      <p className="text-xs text-orange-600 mt-1">
                        Special: {appointment.special_requests}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Client Creation Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Client</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClientModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleClientSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Basic Information</h4>
                
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    type="text"
                    value={clientFormData.name}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={clientFormData.email}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    type="tel"
                    value={clientFormData.phone}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input
                    type="date"
                    value={clientFormData.date_of_birth}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  />
                </div>
              </div>

              {/* Contact & Emergency */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Contact & Emergency</h4>
                
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    type="text"
                    value={clientFormData.address}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Emergency Contact</label>
                  <Input
                    type="text"
                    value={clientFormData.emergency_contact}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    placeholder="Emergency contact name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Emergency Phone</label>
                  <Input
                    type="tel"
                    value={clientFormData.emergency_phone}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, emergency_phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Medical Information</h4>
                
                <div>
                  <label className="text-sm font-medium">Medical Conditions</label>
                  <Input
                    type="text"
                    value={clientFormData.medical_conditions}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, medical_conditions: e.target.value }))}
                    placeholder="Any medical conditions"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Allergies</label>
                  <Input
                    type="text"
                    value={clientFormData.allergies}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, allergies: e.target.value }))}
                    placeholder="Any allergies"
                  />
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Preferences</h4>
                
                <div>
                  <label className="text-sm font-medium">Preferred Communication</label>
                  <select
                    value={clientFormData.preferred_communication}
                    onChange={(e) => setClientFormData(prev => ({ 
                      ...prev, 
                      preferred_communication: e.target.value as 'email' | 'phone' | 'sms' 
                    }))}
                    className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    type="text"
                    value={clientFormData.notes}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional notes"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="marketing_consent"
                    checked={clientFormData.marketing_consent}
                    onChange={(e) => setClientFormData(prev => ({ ...prev, marketing_consent: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="marketing_consent" className="text-sm">
                    I consent to receive marketing communications
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowClientModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createClientMutation.isPending}
                  className="flex-1"
                >
                  {createClientMutation.isPending ? "Creating..." : "Create Client"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
