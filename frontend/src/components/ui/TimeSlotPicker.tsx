import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { servicesAPI } from '../../services/api'
import { format, addDays, subDays, isToday, isTomorrow } from 'date-fns'

interface TimeSlotPickerProps {
  providerId: number
  selectedDate?: Date
  selectedTime?: string
  onDateChange?: (date: Date) => void
  onTimeSelect?: (time: string, datetime: string) => void
  className?: string
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  providerId,
  selectedDate = new Date(),
  selectedTime,
  onDateChange,
  onTimeSelect,
  className = ""
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate)

  // Fetch time slots for the current date
  const { data: timeSlots, isLoading, error } = useQuery({
    queryKey: ['timeslots', providerId, format(currentDate, 'yyyy-MM-dd')],
    queryFn: () => servicesAPI.getTimeSlots(providerId, format(currentDate, 'yyyy-MM-dd')),
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false
  })

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  const handleTimeSelect = (slot: any) => {
    if (slot.is_available) {
      onTimeSelect?.(slot.time, slot.datetime)
    }
  }

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'MMM dd')
  }

  const previousDay = () => {
    const newDate = subDays(currentDate, 1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Don't allow past dates
    if (newDate >= today) {
      handleDateChange(newDate)
    }
  }

  const nextDay = () => {
    handleDateChange(addDays(currentDate, 1))
  }

  if (!providerId) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-gray-500">
          Please select a provider to view available time slots
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Available Times</span>
          </div>
          {timeSlots && (
            <div className="text-sm text-gray-600">
              {timeSlots.available_slots} of {timeSlots.total_slots} available
            </div>
          )}
        </CardTitle>
        
        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={previousDay}
            disabled={(() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              return currentDate <= today
            })()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <div className="font-medium">{getDateLabel(currentDate)}</div>
            <div className="text-sm text-gray-600">
              {format(currentDate, 'EEEE, MMM dd')}
            </div>
          </div>
          
          <Button type="button" variant="outline" size="sm" onClick={nextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading time slots...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600">
            Failed to load time slots. Please try again.
          </div>
        )}

        {timeSlots && timeSlots.slots && (
          <div className="space-y-4">
            {/* Provider Info */}
            <div className="text-sm text-gray-600">
              <strong>{timeSlots.provider_name}</strong> • {format(currentDate, 'MMMM dd, yyyy')}
            </div>

            {/* Time Slots Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {timeSlots.slots.map((slot: any, index: number) => (
                <motion.div
                  key={`${slot.time}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Button
                    type="button"
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={!slot.is_available}
                    onClick={() => handleTimeSelect(slot)}
                    className={`w-full h-auto py-2 px-1 text-xs ${
                      !slot.is_available 
                        ? 'opacity-40 cursor-not-allowed' 
                        : selectedTime === slot.time
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <Clock className="h-3 w-3 mb-1" />
                      <span>{slot.time}</span>
                    </div>
                  </Button>
                </motion.div>
              ))}
            </div>

            {/* No available slots message */}
            {timeSlots.available_slots === 0 && (
              <div className="text-center py-4 text-gray-500">
                No available time slots for this date.
                <br />
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={nextDay}
                  className="mt-2"
                >
                  Try tomorrow →
                </Button>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-600 pt-2 border-t">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-gray-300 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-300 rounded opacity-40"></div>
                <span>Booked</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span>Selected</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TimeSlotPicker
