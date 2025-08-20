import React, { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar'
import moment from 'moment'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../hooks/useRTL'
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  Clock, 
  User, 
  Phone,
  Mail,
  Filter,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api-client'
import QuickAppointmentForm from './QuickAppointmentForm'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import '../../styles/calendar-rtl.css'

// Setup the localizer for BigCalendar with RTL support
const localizer = momentLocalizer(moment)

// Configure moment locales
moment.locale('en', {
  week: {
    dow: 0, // Sunday is the first day of the week
  },
})

moment.locale('he', {
  week: {
    dow: 0, // Sunday is the first day of the week
  },
  months: [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ],
  monthsShort: [
    'ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני',
    'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'
  ],
  weekdays: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
  weekdaysShort: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
  weekdaysMin: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD/MM/YYYY',
    LL: 'D בMMMM YYYY',
    LLL: 'D בMMMM YYYY HH:mm',
    LLLL: 'dddd, D בMMMM YYYY HH:mm'
  },
  calendar: {
    sameDay: '[היום ב־]LT',
    nextDay: '[מחר ב־]LT',
    nextWeek: 'dddd [ב־]LT',
    lastDay: '[אתמול ב־]LT',
    lastWeek: 'dddd [שעבר ב־]LT',
    sameElse: 'L'
  },
  relativeTime: {
    future: 'בעוד %s',
    past: 'לפני %s',
    s: 'מספר שניות',
    ss: '%d שניות',
    m: 'דקה',
    mm: '%d דקות',
    h: 'שעה',
    hh: '%d שעות',
    d: 'יום',
    dd: '%d ימים',
    w: 'שבוע',
    ww: '%d שבועות',
    M: 'חודש',
    MM: '%d חודשים',
    y: 'שנה',
    yy: '%d שנים'
  }
})

// Types
interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  resource?: {
    type: 'appointment' | 'availability' | 'blocked'
    appointment?: Appointment
    provider?: Provider
    status?: string
    client?: {
      name: string
      phone?: string
      email?: string
    }
    notes?: string
  }
}

interface Provider {
  id: number
  business_name: string
  business_description?: string
  phone?: string
  address?: string
  created_at: string
}

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
  status: string
  notes?: string
  internal_notes?: string
  client_notes?: string
  special_requests?: string
  created_at: string
  updated_at?: string
  confirmed_at?: string
  completed_at?: string
}

const Calendar: React.FC = () => {
  console.log("🗓️ Calendar component rendering...")
  
  const { t, i18n } = useTranslation()
  const { isRTL, getFlexDirection, getMargin } = useRTL()
  
  // Set moment locale based on current language
  React.useEffect(() => {
    moment.locale(i18n.language)
  }, [i18n.language])
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>(Views.MONTH)
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)

  // Custom toolbar component with Hebrew support
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV')
    }

    const goToNext = () => {
      toolbar.onNavigate('NEXT')
    }

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY')
    }

    const viewNames = {
      month: t('calendar.thisMonth'),
      week: t('calendar.thisWeek'),
      day: t('calendar.today'),
      agenda: t('calendar.timeSlots')
    }

    return (
      <div className={cn("flex items-center justify-between mb-4", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Button
            variant="outline"
            size="sm"
            onClick={goToBack}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('common.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrent}
          >
            {t('calendar.today')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            className="gap-2"
          >
            {t('common.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <span className="text-lg font-semibold">
            {toolbar.label}
          </span>
        </div>
        
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          {toolbar.views.map((view: string) => (
            <Button
              key={view}
              variant={toolbar.view === view ? "default" : "outline"}
              size="sm"
              onClick={() => toolbar.onView(view)}
            >
              {viewNames[view as keyof typeof viewNames] || view}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // const queryClient = useQueryClient() // Will be used for mutations when needed

  // Fetch providers
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.providers.getAll(),
  })

  // Fetch appointments
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.appointments.getAll(),
  })

  // Convert appointments to calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!appointments) return []
    
    return appointments
      .filter((apt: Appointment) => !selectedProvider || apt.provider_id === selectedProvider)
      .map((apt: Appointment) => {
        const start = new Date(apt.scheduled_at)
        const end = apt.end_time ? new Date(apt.end_time) : new Date(start.getTime() + (apt.duration || 30) * 60000)
        const provider = providers?.find((p: Provider) => p.id === apt.provider_id)
        
        return {
          id: apt.id,
          title: `${apt.service_name} - ${apt.client_name}`,
          start,
          end,
          resource: {
            type: 'appointment' as const,
            appointment: apt,
            provider,
            status: apt.status,
            client: {
              name: apt.client_name,
              phone: apt.client_phone,
              email: apt.client_email
            },
            notes: apt.notes
          }
        }
      })
  }, [appointments, providers, selectedProvider])

  // Event style getter
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const status = event.resource?.status
    let backgroundColor = '#3174ad'
    let borderColor = '#265985'
    
    switch (status) {
      case 'scheduled':
        backgroundColor = '#3b82f6'
        borderColor = '#1e40af'
        break
      case 'confirmed':
        backgroundColor = '#10b981'
        borderColor = '#047857'
        break
      case 'completed':
        backgroundColor = '#6b7280'
        borderColor = '#374151'
        break
      case 'cancelled':
        backgroundColor = '#ef4444'
        borderColor = '#b91c1c'
        break
      case 'no_show':
        backgroundColor = '#f59e0b'
        borderColor = '#d97706'
        break
      default:
        backgroundColor = '#3b82f6'
        borderColor = '#1e40af'
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        fontSize: '12px',
        padding: '2px 6px'
      }
    }
  }, [])

  // Handle event selection
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }, [])

  // Handle slot selection (for creating new appointments)
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end })
    setShowNewAppointmentModal(true)
  }, [])

  // Handle view change
  const handleViewChange = useCallback((newView: View) => {
    setView(newView)
  }, [])

  // Handle navigation
  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate)
  }, [])

  // Get status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />
      case 'no_show':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  // Get status color class
  const getStatusColorClass = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      case 'completed':
        return 'text-gray-600 bg-gray-50'
      case 'no_show':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }



  console.log("📊 Calendar data:", { providers, appointments, providersLoading, appointmentsLoading })

  if (providersLoading || appointmentsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">{t('calendar.loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={cn(getFlexDirection("flex items-center gap-4"))}>
          <CalendarIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">{t('calendar.title')}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSelectedSlot({ start: new Date(), end: new Date(Date.now() + 30 * 60000) })
              setShowNewAppointmentModal(true)
            }}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {t('calendar.addAppointment')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn(getFlexDirection("flex items-center gap-4"))}>
            <div className={cn(getFlexDirection("flex items-center gap-2"))}>
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{t('calendar.filterByProvider')}:</span>
            </div>
            <select
              value={selectedProvider || ''}
              onChange={(e) => setSelectedProvider(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('calendar.allProviders')}</option>
              {providers?.map((provider: Provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.business_name}
                </option>
              ))}
            </select>
            
            <div className={cn("flex items-center gap-4", isRTL ? "mr-8" : "ml-8")}>
              <div className={cn(getFlexDirection("flex items-center gap-2"))}>
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-xs">{t('calendar.legend.scheduled')}</span>
              </div>
              <div className={cn(getFlexDirection("flex items-center gap-2"))}>
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-xs">{t('calendar.legend.confirmed')}</span>
              </div>
              <div className={cn(getFlexDirection("flex items-center gap-2"))}>
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span className="text-xs">{t('calendar.legend.completed')}</span>
              </div>
              <div className={cn(getFlexDirection("flex items-center gap-2"))}>
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-xs">{t('calendar.legend.cancelled')}</span>
              </div>
              <div className={cn(getFlexDirection("flex items-center gap-2"))}>
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-xs">{t('calendar.legend.noShow')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div style={{ height: '600px' }}>
            <BigCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              titleAccessor="title"
              date={date}
              view={view}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              eventPropGetter={eventStyleGetter}
              components={{
                toolbar: CustomToolbar,
              }}
              views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              step={15}
              timeslots={4}
              popup
              rtl={isRTL}
              className={cn("bg-white", isRTL && "rtl")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventModal && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className={cn(getFlexDirection("flex items-center justify-between mb-4"))}>
                <h3 className="text-lg font-semibold">{t('calendar.appointmentDetails')}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEventModal(false)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedEvent.title}</h4>
                  <p className="text-sm text-gray-600">
                    {moment(selectedEvent.start).format('MMMM Do, YYYY')} • {' '}
                    {moment(selectedEvent.start).format('h:mm A')} - {' '}
                    {moment(selectedEvent.end).format('h:mm A')}
                  </p>
                </div>

                {selectedEvent.resource?.provider && (
                  <div className={cn(getFlexDirection("flex items-center gap-2"))}>
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{t('calendar.serviceInfo')}: {selectedEvent.resource.provider.business_name}</span>
                  </div>
                )}

                {selectedEvent.resource?.client && (
                  <div className="space-y-2">
                    <div className={cn(getFlexDirection("flex items-center gap-2"))}>
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{t('calendar.clientInfo')}: {selectedEvent.resource.client.name}</span>
                    </div>
                    {selectedEvent.resource.client.phone && (
                      <div className={cn(getFlexDirection("flex items-center gap-2"))}>
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedEvent.resource.client.phone}</span>
                      </div>
                    )}
                    {selectedEvent.resource.client.email && (
                      <div className={cn(getFlexDirection("flex items-center gap-2"))}>
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedEvent.resource.client.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedEvent.resource?.status && (
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedEvent.resource.status)}
                    <span className={`text-sm px-2 py-1 rounded-full ${getStatusColorClass(selectedEvent.resource.status)}`}>
                      {selectedEvent.resource.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                )}

                {selectedEvent.resource?.appointment?.service_description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Service:</p>
                    <p className="text-sm text-gray-600">{selectedEvent.resource.appointment.service_description}</p>
                  </div>
                )}

                {selectedEvent.resource?.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Notes:</p>
                    <p className="text-sm text-gray-600">{selectedEvent.resource.notes}</p>
                  </div>
                )}

                {selectedEvent.resource?.appointment?.special_requests && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Special Requests:</p>
                    <p className="text-sm text-gray-600">{selectedEvent.resource.appointment.special_requests}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowEventModal(false)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Navigate to appointments page with this appointment
                    setShowEventModal(false)
                  }}
                >
                                  <Edit className="h-4 w-4 mr-2" />
                {t('calendar.edit')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Appointment Modal */}
      <AnimatePresence>
        {showNewAppointmentModal && selectedSlot && (
          <QuickAppointmentForm
            selectedSlot={selectedSlot}
            providers={providers || []}
            onClose={() => {
              setShowNewAppointmentModal(false)
              setSelectedSlot(null)
            }}
            onSuccess={() => {
              console.log("✅ Appointment created successfully!")
            }}
          />
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold">{calendarEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Today's Appointments</p>
                <p className="text-2xl font-bold">
                  {calendarEvents.filter(event => 
                    moment(event.start).isSame(moment(), 'day')
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Active Providers</p>
                <p className="text-2xl font-bold">{providers?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Current View</p>
                <p className="text-2xl font-bold capitalize">{view.toLowerCase()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Calendar