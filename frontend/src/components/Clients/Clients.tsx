import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  Calendar,
  Search,
  User,
  Clock
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { api } from '../../lib/api-client'
// import { cn } from '../../lib/utils' // Will be used for conditional styling

// Types for clients
interface Client {
  id: number
  name: string
  email?: string
  phone?: string
  notes?: string
  total_appointments: number
  last_appointment?: string
  next_appointment?: string
  created_at: string
  updated_at?: string
}

interface ClientFormData {
  name: string
  email: string
  phone: string
  notes: string
}

export function Clients() {
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  })

  // const queryClient = useQueryClient() // Will be used when backend API is ready

  // Fetch clients (using appointments data for now since we don't have a dedicated clients endpoint)
  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.appointments.getAll(),
  })

  // Extract unique clients from appointments
  const clients = React.useMemo(() => {
    if (!appointments) return []
    
    const clientMap = new Map<string, Client>()
    
    appointments.forEach((appointment: any) => {
      const key = appointment.client_email || appointment.client_name
      if (clientMap.has(key)) {
        const existing = clientMap.get(key)!
        existing.total_appointments++
        // Update last appointment if this one is more recent
        if (new Date(appointment.scheduled_at) > new Date(existing.last_appointment || '1900-01-01')) {
          existing.last_appointment = appointment.scheduled_at
        }
        // Update next appointment if this one is upcoming
        if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
          if (!existing.next_appointment || new Date(appointment.scheduled_at) < new Date(existing.next_appointment)) {
            existing.next_appointment = appointment.scheduled_at
          }
        }
      } else {
        clientMap.set(key, {
          id: appointment.id, // Using appointment ID as client ID for now
          name: appointment.client_name,
          email: appointment.client_email,
          phone: appointment.client_phone,
          notes: appointment.client_notes || appointment.special_requests,
          total_appointments: 1,
          last_appointment: appointment.scheduled_at,
          next_appointment: (appointment.status === 'scheduled' || appointment.status === 'confirmed') 
            ? appointment.scheduled_at 
            : undefined,
          created_at: appointment.created_at,
        })
      }
    })
    
    return Array.from(clientMap.values()).sort((a, b) => 
      new Date(b.last_appointment || b.created_at).getTime() - 
      new Date(a.last_appointment || a.created_at).getTime()
    )
  }, [appointments])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, we'll just show a message since we don't have a dedicated clients API
    alert('Client management will be fully implemented when the backend clients API is ready!')
    resetForm()
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      notes: client.notes || "",
    })
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this client? This will not delete their appointments.")) {
      alert('Client deletion will be implemented when the backend clients API is ready!')
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      notes: "",
    })
    setShowForm(false)
    setEditingClient(null)
  }

  const filteredClients = clients.filter((client: Client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (client.phone && client.phone.includes(searchTerm))
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client database and contact information.
          </p>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <span className="font-medium">Note:</span> Currently showing clients extracted from your appointments. 
              Full client management features will be available soon!
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Add/Edit Client Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {editingClient ? "Edit Client" : "Add New Client"}
              </CardTitle>
              <CardDescription>
                {editingClient
                  ? "Update client information"
                  : "Add a new client to your database"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Full Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter client's full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <textarea
                      className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Any notes about this client..."
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    {editingClient ? "Update Client" : "Add Client"}
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
          <p className="text-sm text-muted-foreground mt-2">Loading clients...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">
              Failed to load clients. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!clients || clients.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No clients yet</h3>
            <p className="text-muted-foreground mb-4">
              Clients will appear here automatically when you schedule appointments, or you can add them manually.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add First Client
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Clients Grid */}
      {filteredClients && filteredClients.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client: Client, index: number) => (
            <motion.div
              key={`${client.name}-${client.email || client.phone}`}
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
                        {client.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-muted-foreground">
                          {client.total_appointments} appointment{client.total_appointments !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.last_appointment && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Last: {new Date(client.last_appointment).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {client.next_appointment && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-600">
                          Next: {new Date(client.next_appointment).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {client.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {client.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
