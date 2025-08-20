import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../hooks/useRTL'
import { 
  Calendar, 
  UserPlus, 
  Trash2, 
  Save,
  X,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { providersAPI, availabilityAPI } from '../../services/api'
import { toast } from 'sonner'

// Types for availability
interface TimeSlot {
  start: string // HH:MM format
  end: string   // HH:MM format
}

interface DayAvailability {
  day: string
  available: boolean
  slots: TimeSlot[]
}

interface Provider {
  id: number
  business_name: string
}

// interface AvailabilityData {
//   provider_id: number
//   weekly_schedule: DayAvailability[]
//   exceptions: {
//     date: string // YYYY-MM-DD
//     available: boolean
//     slots?: TimeSlot[]
//     reason?: string
//   }[]
// }

// DAYS_OF_WEEK will be created dynamically with translations

// DEFAULT_AVAILABILITY will be created dynamically

export function Availability() {
  const { t } = useTranslation()
  const { isRTL, getFlexDirection, getMargin } = useRTL()
  
  // Create DAYS_OF_WEEK dynamically with translations
  const DAYS_OF_WEEK = [
    { key: 'monday', label: t('availability.monday') },
    { key: 'tuesday', label: t('availability.tuesday') },
    { key: 'wednesday', label: t('availability.wednesday') },
    { key: 'thursday', label: t('availability.thursday') },
    { key: 'friday', label: t('availability.friday') },
    { key: 'saturday', label: t('availability.saturday') },
    { key: 'sunday', label: t('availability.sunday') },
  ]
  
  const [selectedProvider, setSelectedProvider] = useState<number>(0)
  
  // Create DEFAULT_AVAILABILITY dynamically
  const DEFAULT_AVAILABILITY: DayAvailability[] = DAYS_OF_WEEK.map(day => ({
    day: day.key,
    available: day.key !== 'saturday' && day.key !== 'sunday',
    slots: day.key !== 'saturday' && day.key !== 'sunday' 
      ? [{ start: '09:00', end: '17:00' }] 
      : []
  }))
  
  const [weeklySchedule, setWeeklySchedule] = useState<DayAvailability[]>(DEFAULT_AVAILABILITY)
  const [exceptions, setExceptions] = useState<any[]>([])
  const [showExceptionForm, setShowExceptionForm] = useState(false)
  const [exceptionForm, setExceptionForm] = useState({
    date: '',
    available: false,
    reason: ''
  })

  const queryClient = useQueryClient()

  // Fetch providers
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: () => providersAPI.getProviders(),
  })

  // Fetch weekly schedule for selected provider
  const { data: weeklyScheduleData, isLoading } = useQuery({
    queryKey: ["availability", selectedProvider],
    queryFn: () => availabilityAPI.getWeeklySchedule(selectedProvider),
    enabled: selectedProvider > 0,
    staleTime: 2 * 60 * 1000,
    retry: false
  })

  // Create availability mutation
  const createAvailabilityMutation = useMutation({
    mutationFn: (availabilityData: any) => availabilityAPI.createBulkAvailability(availabilityData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability", selectedProvider] })
      toast.success('Availability saved successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save availability')
    }
  })

  // Create exception mutation
  const createExceptionMutation = useMutation({
    mutationFn: (exceptionData: any) => availabilityAPI.createException(exceptionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability", selectedProvider] })
      setShowExceptionForm(false)
      setExceptionForm({ date: '', available: false, reason: '' })
      toast.success('Exception added successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add exception')
    }
  })

  const handleTimeChange = (dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    const newSchedule = [...weeklySchedule]
    newSchedule[dayIndex].slots[slotIndex][field] = value
    setWeeklySchedule(newSchedule)
  }

  const addTimeSlot = (dayIndex: number) => {
    const newSchedule = [...weeklySchedule]
    const lastSlot = newSchedule[dayIndex].slots[newSchedule[dayIndex].slots.length - 1]
    const newStart = lastSlot ? lastSlot.end : '09:00'
    newSchedule[dayIndex].slots.push({ start: newStart, end: '18:00' })
    setWeeklySchedule(newSchedule)
  }

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const newSchedule = [...weeklySchedule]
    newSchedule[dayIndex].slots.splice(slotIndex, 1)
    setWeeklySchedule(newSchedule)
  }

  const toggleDayAvailability = (dayIndex: number) => {
    const newSchedule = [...weeklySchedule]
    newSchedule[dayIndex].available = !newSchedule[dayIndex].available
    if (newSchedule[dayIndex].available && newSchedule[dayIndex].slots.length === 0) {
      newSchedule[dayIndex].slots = [{ start: '09:00', end: '17:00' }]
    }
    setWeeklySchedule(newSchedule)
  }

  const addException = () => {
    if (!exceptionForm.date) {
      toast.error('Please select a date')
      return
    }
    
    if (!selectedProvider) {
      toast.error('Please select a provider first')
      return
    }
    
    const exceptionData = {
      provider_id: selectedProvider,
      start_date: exceptionForm.date,
      end_date: exceptionForm.date,
      exception_type: exceptionForm.available ? 'custom' : 'unavailable',
      is_available: exceptionForm.available,
      title: exceptionForm.reason || (exceptionForm.available ? 'Custom Hours' : 'Unavailable'),
      description: exceptionForm.reason,
      is_active: true
    }
    
    createExceptionMutation.mutate(exceptionData)
  }

  const removeException = (index: number) => {
    const newExceptions = [...exceptions]
    newExceptions.splice(index, 1)
    setExceptions(newExceptions)
  }

  const saveAvailability = () => {
    if (!selectedProvider) {
      toast.error('Please select a provider first')
      return
    }
    
    // Convert weekly schedule to API format
    const availabilityRules = weeklySchedule.flatMap(day => {
      if (!day.available || day.slots.length === 0) {
        return []
      }
      
      return day.slots.map(slot => ({
        availability_type: 'recurring',
        day_of_week: day.day,
        start_time: slot.start,
        end_time: slot.end,
        is_available: true,
        is_active: true,
        priority: 0,
        buffer_minutes: 0
      }))
    })
    
    const bulkData = {
      provider_id: selectedProvider,
      availability_rules: availabilityRules,
      replace_existing: true
    }
    
    createAvailabilityMutation.mutate(bulkData)
  }

  const isTimeConflict = (day: DayAvailability) => {
    for (let i = 0; i < day.slots.length - 1; i++) {
      const current = day.slots[i]
      const next = day.slots[i + 1]
      if (current.end > next.start) {
        return true
      }
    }
    return false
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('availability.title')}</h1>
          <p className="text-muted-foreground">
            {t('availability.description')}
          </p>
        </div>
        <Button
          onClick={saveAvailability}
          className="bg-green-600 hover:bg-green-700"
          disabled={!selectedProvider || createAvailabilityMutation.isPending}
        >
          {createAvailabilityMutation.isPending ? (
            <Clock className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {createAvailabilityMutation.isPending ? t('common.saving') : t('availability.saveSchedule')}
        </Button>
      </div>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('availability.selectProvider')}</CardTitle>
          <CardDescription>
            {t('availability.selectProviderDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>{t('availability.selectProviderOption')}</option>
            {providers?.map((provider: Provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.business_name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedProvider > 0 && (
        <>
          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('availability.weeklySchedule')}
              </CardTitle>
              <CardDescription>
                {t('availability.weeklyScheduleDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklySchedule.map((day, dayIndex) => (
                <motion.div
                  key={day.day}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.1 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium capitalize">{day.day}</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={day.available}
                          onChange={() => toggleDayAvailability(dayIndex)}
                          className="rounded"
                        />
                        <span className="text-sm">{t('availability.available')}</span>
                      </label>
                    </div>
                    {day.available && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addTimeSlot(dayIndex)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {t('availability.addSlot')}
                      </Button>
                    )}
                  </div>

                  {day.available && (
                    <div className="space-y-2">
                      {day.slots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={slot.start}
                            onChange={(e) => handleTimeChange(dayIndex, slotIndex, 'start', e.target.value)}
                            className="w-32"
                          />
                          <span>{t('availability.to')}</span>
                          <Input
                            type="time"
                            value={slot.end}
                            onChange={(e) => handleTimeChange(dayIndex, slotIndex, 'end', e.target.value)}
                            className="w-32"
                          />
                          {day.slots.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {isTimeConflict(day) && (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{t('availability.timeSlotsOverlap')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!day.available && (
                    <p className="text-sm text-muted-foreground">{t('availability.notAvailableOnDay')}</p>
                  )}
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Exceptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('availability.scheduleExceptions')}
              </CardTitle>
              <CardDescription>
                {t('availability.scheduleExceptionsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setShowExceptionForm(true)}
                variant="outline"
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('availability.addException')}
              </Button>

              {showExceptionForm && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">{t('availability.date')}</label>
                      <Input
                        type="date"
                        value={exceptionForm.date}
                        onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('availability.status')}</label>
                      <select
                        value={exceptionForm.available ? 'available' : 'unavailable'}
                        onChange={(e) => setExceptionForm({ ...exceptionForm, available: e.target.value === 'available' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="unavailable">{t('availability.notAvailable')}</option>
                        <option value="available">{t('availability.availableDifferentHours')}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('availability.reasonOptional')}</label>
                    <Input
                      value={exceptionForm.reason}
                      onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
                      placeholder={t('availability.reasonPlaceholder')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addException} size="sm">
                      {t('availability.addException')}
                    </Button>
                    <Button 
                      onClick={() => setShowExceptionForm(false)} 
                      variant="outline" 
                      size="sm"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </motion.div>
              )}

              {exceptions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">{t('availability.upcomingExceptions')}</h4>
                  {exceptions.map((exception, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {new Date(exception.date).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            exception.available 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {exception.available ? t('availability.differentHours') : t('availability.unavailable')}
                          </span>
                        </div>
                        {exception.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {exception.reason}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeException(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Info Card */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium">{t('availability.howAvailabilityWorks')}</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {(t('availability.availabilityRules', { returnObjects: true }) as string[]).map((rule: string, index: number) => (
                  <li key={index}>• {rule}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
