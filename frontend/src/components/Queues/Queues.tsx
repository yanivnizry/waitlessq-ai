import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2,
  Search
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { api } from '../../lib/api-client'
import { queuesAPI } from '../../services/api'
import { cn } from '../../lib/utils'

// Types based on backend schemas
interface Queue {
  id: number
  provider_id: number
  name: string
  description?: string
  status: 'active' | 'paused' | 'closed'
  max_size: number
  estimated_wait_time?: number
  created_at: string
  updated_at?: string
}

interface QueueEntry {
  id: number
  queue_id: number
  client_name: string
  client_phone?: string
  client_email?: string
  position: number
  status: 'waiting' | 'called' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  joined_at: string
  called_at?: string
  completed_at?: string
  estimated_wait_time?: number
  created_at: string
  updated_at?: string
}

interface QueueFormData {
  provider_id: number
  name: string
  description: string
  max_size: number
  estimated_wait_time: number
}

interface QueueEntryFormData {
  client_name: string
  client_phone: string
  client_email: string
  notes: string
}

interface Provider {
  id: number
  business_name: string
}

export function Queues() {
  const [showQueueForm, setShowQueueForm] = useState(false)
  const [showEntryForm, setShowEntryForm] = useState<number | null>(null)
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null)
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [queueFormData, setQueueFormData] = useState<QueueFormData>({
    provider_id: 0,
    name: "",
    description: "",
    max_size: 50,
    estimated_wait_time: 15,
  })
  const [entryFormData, setEntryFormData] = useState<QueueEntryFormData>({
    client_name: "",
    client_phone: "",
    client_email: "",
    notes: "",
  })

  const queryClient = useQueryClient()

  // Fetch queues
  const { data: queues, isLoading, error } = useQuery({
    queryKey: ["queues"],
    queryFn: () => api.queues.getAll(),
  })

  // Fetch providers for the form
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.providers.getAll(),
  })

  // Fetch queue entries for selected queue
  const { data: queueEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ["queue-entries", selectedQueue?.id],
    queryFn: () => selectedQueue ? queuesAPI.getQueueEntries(selectedQueue.id) : null,
    enabled: !!selectedQueue,
  })

  // Create queue mutation
  const createQueueMutation = useMutation({
    mutationFn: (queueData: any) => api.queues.create(queueData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
      setShowQueueForm(false)
      resetQueueForm()
    },
    onError: (error: any) => {
      console.error("Failed to create queue:", error)
    },
  })

  // Update queue mutation
  const updateQueueMutation = useMutation({
    mutationFn: ({ id, ...queueData }: any) => api.queues.update(id, queueData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
      setShowQueueForm(false)
      resetQueueForm()
    },
    onError: (error: any) => {
      console.error("Failed to update queue:", error)
    },
  })

  // Delete queue mutation
  const deleteQueueMutation = useMutation({
    mutationFn: (id: number) => api.queues.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] })
      if (selectedQueue?.id === id) {
        setSelectedQueue(null)
      }
    },
    onError: (error: any) => {
      console.error("Failed to delete queue:", error)
    },
  })

  // Add to queue mutation
  const addToQueueMutation = useMutation({
    mutationFn: ({ queueId, entryData }: any) => queuesAPI.addQueueEntry(queueId, entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue-entries", selectedQueue?.id] })
      queryClient.invalidateQueries({ queryKey: ["queues"] })
      setShowEntryForm(null)
      resetEntryForm()
    },
    onError: (error: any) => {
      console.error("Failed to add to queue:", error)
    },
  })

  // Call next mutation (updates the first waiting entry to "called" status)
  const callNextMutation = useMutation({
    mutationFn: (queueId: number) => {
      // Find the first waiting entry and update its status to "called"
      const waitingEntry = queueEntries?.find((entry: QueueEntry) => entry.status === 'waiting')
      if (!waitingEntry) {
        throw new Error('No waiting entries to call')
      }
      return queuesAPI.updateQueueEntry(queueId, waitingEntry.id, { 
        status: 'called',
        called_at: new Date().toISOString()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue-entries", selectedQueue?.id] })
      queryClient.invalidateQueries({ queryKey: ["queues"] })
    },
    onError: (error: any) => {
      console.error("Failed to call next:", error)
    },
  })

  const removeEntryMutation = useMutation({
    mutationFn: ({ queueId, entryId }: { queueId: number, entryId: number }) => 
      queuesAPI.removeQueueEntry(queueId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue-entries", selectedQueue?.id] })
      queryClient.invalidateQueries({ queryKey: ["queues"] })
    },
    onError: (error: any) => {
      console.error("Failed to remove queue entry:", error)
    },
  })

  const handleQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingQueue) {
      updateQueueMutation.mutate({ id: editingQueue.id, ...queueFormData })
    } else {
      createQueueMutation.mutate(queueFormData)
    }
  }

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (showEntryForm) {
      addToQueueMutation.mutate({ 
        queueId: showEntryForm, 
        entryData: { ...entryFormData, queue_id: showEntryForm }
      })
    }
  }

  const handleEditQueue = (queue: Queue) => {
    setEditingQueue(queue)
    setQueueFormData({
      provider_id: queue.provider_id,
      name: queue.name,
      description: queue.description || "",
      max_size: queue.max_size,
      estimated_wait_time: queue.estimated_wait_time || 15,
    })
    setShowQueueForm(true)
  }

  const handleDeleteQueue = (id: number) => {
    if (window.confirm("Are you sure you want to delete this queue?")) {
      deleteQueueMutation.mutate(id)
    }
  }

  const resetQueueForm = () => {
    setQueueFormData({
      provider_id: 0,
      name: "",
      description: "",
      max_size: 50,
      estimated_wait_time: 15,
    })
    setShowQueueForm(false)
    setEditingQueue(null)
  }

  const resetEntryForm = () => {
    setEntryFormData({
      client_name: "",
      client_phone: "",
      client_email: "",
      notes: "",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'closed': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  // const getEntryStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'waiting': return 'bg-blue-500'
  //     case 'called': return 'bg-yellow-500'
  //     case 'completed': return 'bg-green-500'
  //     case 'cancelled': return 'bg-red-500'
  //     case 'no_show': return 'bg-orange-500'
  //     default: return 'bg-gray-400'
  //   }
  // }

  const filteredQueues = queues?.filter((queue: Queue) => {
    const matchesSearch = queue.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || queue.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queues</h1>
          <p className="text-muted-foreground">
            Manage waiting queues and customer flow.
          </p>
        </div>
        <Button
          onClick={() => setShowQueueForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Create Queue
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search queues..."
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
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Create/Edit Queue Form */}
      {showQueueForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                {editingQueue ? "Edit Queue" : "Create New Queue"}
              </CardTitle>
              <CardDescription>
                {editingQueue
                  ? "Update queue settings"
                  : "Set up a new waiting queue for your service"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleQueueSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Provider *</label>
                    <select
                      value={queueFormData.provider_id}
                      onChange={(e) =>
                        setQueueFormData({ ...queueFormData, provider_id: parseInt(e.target.value) })
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
                    <label className="text-sm font-medium">Queue Name *</label>
                    <Input
                      value={queueFormData.name}
                      onChange={(e) =>
                        setQueueFormData({ ...queueFormData, name: e.target.value })
                      }
                      placeholder="Enter queue name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Size</label>
                    <Input
                      type="number"
                      value={queueFormData.max_size}
                      onChange={(e) =>
                        setQueueFormData({ ...queueFormData, max_size: parseInt(e.target.value) })
                      }
                      placeholder="50"
                      min={1}
                      max={500}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Estimated Wait Time (minutes)</label>
                    <Input
                      type="number"
                      value={queueFormData.estimated_wait_time}
                      onChange={(e) =>
                        setQueueFormData({ ...queueFormData, estimated_wait_time: parseInt(e.target.value) })
                      }
                      placeholder="15"
                      min={1}
                      max={120}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={queueFormData.description}
                      onChange={(e) =>
                        setQueueFormData({ ...queueFormData, description: e.target.value })
                      }
                      placeholder="Describe this queue..."
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={
                      createQueueMutation.isPending ||
                      updateQueueMutation.isPending
                    }
                  >
                    {createQueueMutation.isPending ||
                    updateQueueMutation.isPending
                      ? "Saving..."
                      : editingQueue
                      ? "Update Queue"
                      : "Create Queue"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetQueueForm}
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
          <p className="text-sm text-muted-foreground mt-2">Loading queues...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">
              Failed to load queues. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!queues || queues.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No queues yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first queue to start managing customer flow.
            </p>
            <Button
              onClick={() => setShowQueueForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create First Queue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Queues Grid */}
      {filteredQueues && filteredQueues.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredQueues.map((queue: Queue, index: number) => (
            <motion.div
              key={queue.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{queue.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            getStatusColor(queue.status)
                          )}
                        />
                        <span className="text-sm text-muted-foreground capitalize">
                          {queue.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditQueue(queue)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteQueue(queue.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {queue.description && (
                    <p className="text-sm text-muted-foreground">
                      {queue.description}
                    </p>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Max Size:</span>
                      <span className="font-medium">{queue.max_size}</span>
                    </div>
                    {queue.estimated_wait_time && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Est. Wait:</span>
                        <span className="font-medium">{queue.estimated_wait_time} min</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setSelectedQueue(queue)}
                      className="flex-1"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      View Queue
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowEntryForm(queue.id)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Queue Detail Modal */}
      {selectedQueue && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedQueue(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{selectedQueue.name}</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => callNextMutation.mutate(selectedQueue.id)}
                    disabled={callNextMutation.isPending}
                  >
                    Call Next
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedQueue(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
              
              {/* Queue entries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Queue Entries</h3>
                  <Button
                    size="sm"
                    onClick={() => setShowEntryForm(selectedQueue.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add to Queue
                  </Button>
                </div>
                
                {entriesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading queue entries...
                  </div>
                ) : queueEntries && queueEntries.length > 0 ? (
                  <div className="space-y-2">
                    {queueEntries.map((entry: QueueEntry) => (
                      <Card key={entry.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                              #{entry.position}
                            </div>
                            <div>
                              <h4 className="font-medium">{entry.client_name}</h4>
                              <div className="text-sm text-muted-foreground">
                                {entry.client_phone && <span>📞 {entry.client_phone}</span>}
                                {entry.client_email && (
                                  <span className="ml-2">✉️ {entry.client_email}</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Joined: {new Date(entry.joined_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              entry.status === 'waiting' && "bg-yellow-100 text-yellow-800",
                              entry.status === 'called' && "bg-blue-100 text-blue-800",
                              entry.status === 'completed' && "bg-green-100 text-green-800",
                              entry.status === 'cancelled' && "bg-red-100 text-red-800",
                              entry.status === 'no_show' && "bg-gray-100 text-gray-800"
                            )}>
                              {entry.status.replace('_', ' ').toUpperCase()}
                            </span>
                            
                            {entry.status === 'waiting' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => callNextMutation.mutate(selectedQueue.id)}
                                disabled={callNextMutation.isPending}
                              >
                                Call
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeEntryMutation.mutate({ queueId: selectedQueue.id, entryId: entry.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {entry.notes && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <strong>Notes:</strong> {entry.notes}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No entries in this queue yet.
                    <br />
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setShowEntryForm(selectedQueue.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add First Entry
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Add to Queue Form */}
      {showEntryForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowEntryForm(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Add to Queue</h2>
              <form onSubmit={handleEntrySubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Client Name *</label>
                  <Input
                    value={entryFormData.client_name}
                    onChange={(e) =>
                      setEntryFormData({ ...entryFormData, client_name: e.target.value })
                    }
                    placeholder="Enter client name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Client Phone</label>
                  <Input
                    value={entryFormData.client_phone}
                    onChange={(e) =>
                      setEntryFormData({ ...entryFormData, client_phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Client Email</label>
                  <Input
                    type="email"
                    value={entryFormData.client_email}
                    onChange={(e) =>
                      setEntryFormData({ ...entryFormData, client_email: e.target.value })
                    }
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    className="w-full min-h-[60px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={entryFormData.notes}
                    onChange={(e) =>
                      setEntryFormData({ ...entryFormData, notes: e.target.value })
                    }
                    placeholder="Any special notes..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={addToQueueMutation.isPending}
                    className="flex-1"
                  >
                    {addToQueueMutation.isPending ? "Adding..." : "Add to Queue"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEntryForm(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
