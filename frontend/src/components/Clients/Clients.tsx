import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  Clock,
  Send,
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw
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
  
  // Account and invitation fields
  has_account: boolean
  invitation_sent_at?: string
  invitation_expires_at?: string
  account_created_at?: string
  last_login_at?: string
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

  const queryClient = useQueryClient()
  
  // Invitation mutations
  const sendInvitationMutation = useMutation({
    mutationFn: (clientId: number) => api.clients.sendInvitation(clientId),
    onSuccess: (data) => {
      toast.success(data.message || 'Invitation sent successfully!')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to send invitation')
    },
  })

  const resendInvitationMutation = useMutation({
    mutationFn: (clientId: number) => api.clients.resendInvitation(clientId),
    onSuccess: (data) => {
      toast.success(data.message || 'Invitation resent successfully!')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to resend invitation')
    },
  })

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: (clientData: any) => api.clients.create(clientData),
    onSuccess: (data) => {
      toast.success('Client created successfully!')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      resetForm()
      setShowForm(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create client')
    },
  })

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => api.clients.update(id, data),
    onSuccess: (data) => {
      toast.success('Client updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      resetForm()
      setShowForm(false)
      setEditingClient(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update client')
    },
  })

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: (clientId: number) => api.clients.delete(clientId),
    onSuccess: () => {
      toast.success('Client deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete client')
    },
  })

  // Fetch clients from the dedicated clients API
  const { data: clientsResponse, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.clients.getAll({ page: 1, per_page: 100, is_active: true }),
  })

  // Process clients data to ensure all required fields are present
  const clients = React.useMemo(() => {
    if (!clientsResponse?.clients) return []
    
    return clientsResponse.clients.map((client: any) => ({
      ...client,
      // Ensure invitation fields have default values
      has_account: client.has_account || false,
      invitation_sent_at: client.invitation_sent_at || null,
      invitation_expires_at: client.invitation_expires_at || null,
      account_created_at: client.account_created_at || null,
      last_login_at: client.last_login_at || null,
    }))
  }, [clientsResponse])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingClient) {
      // Update existing client
      updateClientMutation.mutate({
        id: editingClient.id,
        data: formData
      })
    } else {
      // Create new client
      createClientMutation.mutate(formData)
    }
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
      deleteClientMutation.mutate(id)
    }
  }

  const handleSendInvitation = (client: Client) => {
    if (!client.email) {
      toast.error('Client must have an email address to receive an invitation')
      return
    }
    
    if (client.has_account) {
      toast.info('Client already has an account')
      return
    }
    
    sendInvitationMutation.mutate(client.id)
  }

  const handleResendInvitation = (client: Client) => {
    if (!client.email) {
      toast.error('Client must have an email address to receive an invitation')
      return
    }
    
    resendInvitationMutation.mutate(client.id)
  }

  const getAccountStatus = (client: Client) => {
    if (client.has_account) {
      return { status: 'active', text: 'Has Account', icon: CheckCircle, color: 'text-green-600' }
    } else if (client.invitation_sent_at) {
      const expiry = client.invitation_expires_at ? new Date(client.invitation_expires_at) : null
      const isExpired = expiry && expiry < new Date()
      
      if (isExpired) {
        return { status: 'expired', text: 'Invitation Expired', icon: XCircle, color: 'text-red-600' }
      } else {
        return { status: 'invited', text: 'Invitation Sent', icon: Send, color: 'text-blue-600' }
      }
    } else {
      return { status: 'not_invited', text: 'No Account', icon: User, color: 'text-gray-600' }
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
                  <Button 
                    type="submit" 
                    disabled={createClientMutation.isPending || updateClientMutation.isPending}
                  >
                    {createClientMutation.isPending || updateClientMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingClient ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      editingClient ? "Update Client" : "Add Client"
                    )}
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
                      {/* Account Status and Invitation Buttons */}
                      {(() => {
                        const accountStatus = getAccountStatus(client)
                        const StatusIcon = accountStatus.icon
                        
                        return (
                          <>
                            {/* Account Status Indicator */}
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted mr-2">
                              <StatusIcon className={`h-3 w-3 ${accountStatus.color}`} />
                              <span className={`text-xs font-medium ${accountStatus.color}`}>
                                {accountStatus.text}
                              </span>
                            </div>
                            
                            {/* Invitation Buttons */}
                            {client.email && !client.has_account && (
                              <>
                                {accountStatus.status === 'not_invited' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSendInvitation(client)}
                                    disabled={sendInvitationMutation.isPending}
                                    title="Send invitation"
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {(accountStatus.status === 'invited' || accountStatus.status === 'expired') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleResendInvitation(client)}
                                    disabled={resendInvitationMutation.isPending}
                                    title="Resend invitation"
                                    className="text-orange-600 hover:text-orange-700"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                            
                            {/* PWA Access Button for clients with accounts */}
                            {client.has_account && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  // TODO: Open PWA for this client
                                  toast.info('PWA access will be available soon')
                                }}
                                title="Open client PWA"
                                className="text-green-600 hover:text-green-700"
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* Edit Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(client)}
                              title="Edit client"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(client.id)}
                              disabled={deleteClientMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                              title="Delete client"
                            >
                              {deleteClientMutation.isPending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )
                      })()}
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
