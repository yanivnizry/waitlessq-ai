import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Users, Clock, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRTL } from '../../hooks/useRTL'
import { cn } from '../../lib/utils'
import QuickAddButton from '../Dashboard/QuickAddButton'

const FloatingActionButton: React.FC = () => {
  const { isRTL, getFlexDirection } = useRTL()
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const quickActions = [
    {
      icon: Plus,
      label: 'Quick Add',
      color: 'bg-blue-600 hover:bg-blue-700',
      component: 'quick-add'
    },
    {
      icon: Calendar,
      label: 'Calendar',
      color: 'bg-green-600 hover:bg-green-700',
      action: () => navigate('/calendar')
    },
    {
      icon: Users,
      label: 'Clients',
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => navigate('/clients')
    },
    {
      icon: Clock,
      label: 'Appointments',
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => navigate('/appointments')
    }
  ]

  return (
    <div className={cn("fixed bottom-6 z-40", isRTL ? "left-6" : "right-6")}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn("absolute bottom-16 space-y-3", isRTL ? "left-0" : "right-0")}
          >
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: 20, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="bg-white px-3 py-1 rounded-full shadow-lg text-sm font-medium text-gray-700">
                  {action.label}
                </div>
                {action.component === 'quick-add' ? (
                  <div onClick={() => setIsOpen(false)}>
                    <QuickAddButton />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      action.action?.()
                      setIsOpen(false)
                    }}
                    className={`w-12 h-12 rounded-full ${action.color} text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110`}
                  >
                    <action.icon className="h-6 w-6" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${
          isOpen ? 'rotate-45' : ''
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
      </motion.button>
    </div>
  )
}

export default FloatingActionButton
