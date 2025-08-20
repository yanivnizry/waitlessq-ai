import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../hooks/useRTL'
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
  const { t } = useTranslation()
  const { isRTL, getFlexDirection, getMargin } = useRTL()
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
      toast.success(data.message || t('clients.invitationSentSuccess'))
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t('clients.failedToSendInvitation'))
    },
  })

  const resendInvitationMutation = useMutation({
    mutationFn: (clientId: number) => api.clients.resendInvitation(clientId),
    onSuccess: (data) => {
      toast.success(data.message || t('clients.invitationResentSuccess'))
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t('clients.failedToResendInvitation'))
    },
  })

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: (clientData: any) => api.clients.create(clientData),
    onSuccess: (data) => {
      toast.success(t('clients.clientCreatedSuccess'))
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
      toast.success(t('clients.clientUpdatedSuccess'))
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      resetForm()
      setShowForm(false)
      setEditingClient(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t('clients.failedToUpdateClient'))
    },
  })

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: (clientId: number) => api.clients.delete(clientId),
    onSuccess: () => {
      toast.success(t('clients.clientDeletedSuccess'))
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || t('clients.failedToDeleteClient'))
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
    if (window.confirm(t('clients.confirmDelete'))) {
      deleteClientMutation.mutate(id)
    }
  }

  const handleSendInvitation = (client: Client) => {
    if (!client.email) {
      toast.error(t('clients.emailRequiredForInvitation'))
      return
    }
    
    if (client.has_account) {
      toast.info(t('clients.clientAlreadyHasAccount'))
      return
    }
    
    sendInvitationMutation.mutate(client.id)
  }

    const handleResendInvitation = (client: Client) => {
    if (!client.email) {
      toast.error(t('clients.emailRequiredForInvitation'))
      return
    }

    resendInvitationMutation.mutate(client.id)
  }

  const handleOpenPWA = async (client: Client) => {
    try {
      // Use the PWA generate endpoint to get the correct URLs
      const pwaInfo = await api.pwa.generatePWA()
      
      if (!pwaInfo || !pwaInfo.subdomain_url) {
        toast.error('Unable to generate PWA URL. Please try again.')
        return
      }

      // Use the subdomain URL from the PWA generator
      const pwaUrl = pwaInfo.subdomain_url

      // Open PWA in new tab
      window.open(pwaUrl, '_blank', 'noopener,noreferrer')
      
      toast.success(`Opening PWA for ${client.name}`)
      console.log(`🌐 PWA URL: ${pwaUrl}`)  // Debug log
      
    } catch (error) {
      console.error('Error opening PWA:', error)
      toast.error('Failed to open PWA. Please try again.')
    }
  }

  const getAccountStatus = (client: Client) => {
    if (client.has_account) {
      return { status: 'active', text: t('clients.hasAccount'), icon: CheckCircle, color: 'text-green-600' }
    } else if (client.invitation_sent_at) {
      const expiry = client.invitation_expires_at ? new Date(client.invitation_expires_at) : null
      const isExpired = expiry && expiry < new Date()
      
      if (isExpired) {
        return { status: 'expired', text: t('clients.invitationExpired'), icon: XCircle, color: 'text-red-600' }
      } else {
        return { status: 'invited', text: t('clients.invitationSent'), icon: Send, color: 'text-blue-600' }
      }
    } else {
      return { status: 'not_invited', text: t('clients.noAccount'), icon: User, color: 'text-gray-600' }
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
          <h1 className="text-3xl font-bold tracking-tight">{t('clients.title')}</h1>
          <p className="text-muted-foreground">
            {t('clients.manageDatabase')}
          </p>
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-800">
              <span className="font-medium">✅</span> {t('clients.fullClientManagement')}
            </p>
          </div>
        </div>
                  <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t('clients.add')}
          </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('clients.searchPlaceholder')}
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
                {editingClient ? t('clients.edit') : t('clients.addNew')}
              </CardTitle>
              <CardDescription>
                {editingClient
                  ? t('clients.updateInfo')
                  : t('clients.addToDatabase')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t('clients.fullName')} *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={t('clients.enterFullName')}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('clients.email')}</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder={t('clients.emailPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('clients.phone')}</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder={t('clients.phonePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('clients.notes')}</label>
                    <textarea
                      className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder={t('clients.notesPlaceholder')}
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
                        {editingClient ? t('clients.updating') : t('clients.creating')}
                      </>
                    ) : (
                      editingClient ? t('clients.updateClient') : t('clients.addClient')
                    )}
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
          <p className="text-sm text-muted-foreground mt-2">{t('clients.loading')}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">
              {t('clients.loadError')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!clients || clients.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('clients.noClientsYet')}</h3>
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
                            {client.email && (
                              <>
                                {!client.has_account && accountStatus.status === 'not_invited' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSendInvitation(client)}
                                    disabled={sendInvitationMutation.isPending}
                                    title={t('clients.sendInvitation')}
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {!client.has_account && (accountStatus.status === 'invited' || accountStatus.status === 'expired') && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleResendInvitation(client)}
                                    disabled={resendInvitationMutation.isPending}
                                    title={t('clients.resendInvitation')}
                                    className="text-orange-600 hover:text-orange-700"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                                
                                {/* Show resend invitation button even for clients with accounts (for admin purposes) */}
                                {client.has_account && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleResendInvitation(client)}
                                    disabled={resendInvitationMutation.isPending}
                                    title={t('clients.resendInvitation')}
                                    className="text-purple-600 hover:text-purple-700"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                            
                            {/* PWA Access Button for clients with accounts */}
                            {client.has_account && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenPWA(client)}
                                title={t('clients.openClientPWA')}
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
                              title={t('clients.editClient')}
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
                              title={t('clients.deleteClient')}
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
                          {t('clients.last')}: {new Date(client.last_appointment).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {client.next_appointment && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-600">
                          {t('clients.next')}: {new Date(client.next_appointment).toLocaleDateString()}
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
