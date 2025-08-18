import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: 'appointments' | 'clients' | 'revenue' | 'consistency' | 'growth' | 'special'
  points: number
  requirement: number
  currentProgress: number
  isUnlocked: boolean
  unlockedAt?: Date
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface Level {
  level: number
  title: string
  minPoints: number
  maxPoints: number
  benefits: string[]
  icon: string
}

export interface GamificationStats {
  totalPoints: number
  currentLevel: number
  appointmentsCompleted: number
  clientsServed: number
  totalRevenue: number
  streakDays: number
  lastActivityDate?: Date
}

interface GamificationStore {
  stats: GamificationStats
  achievements: Achievement[]
  levels: Level[]
  
  // Actions
  addPoints: (points: number, reason: string) => void
  completeAppointment: () => void
  addNewClient: () => void
  addRevenue: (amount: number) => void
  updateStreak: () => void
  checkAchievements: () => Achievement[]
  getCurrentLevel: () => Level
  getProgressToNextLevel: () => { current: number; required: number; percentage: number }
  resetStats: () => void
}

const LEVELS: Level[] = [
  {
    level: 1,
    title: "Newcomer",
    minPoints: 0,
    maxPoints: 99,
    benefits: ["Basic dashboard access"],
    icon: "🌱"
  },
  {
    level: 2,
    title: "Assistant",
    minPoints: 100,
    maxPoints: 249,
    benefits: ["Calendar integration", "Basic analytics"],
    icon: "👨‍⚕️"
  },
  {
    level: 3,
    title: "Professional",
    minPoints: 250,
    maxPoints: 499,
    benefits: ["Advanced scheduling", "Client insights"],
    icon: "💼"
  },
  {
    level: 4,
    title: "Expert",
    minPoints: 500,
    maxPoints: 999,
    benefits: ["Queue management", "Revenue analytics"],
    icon: "🎯"
  },
  {
    level: 5,
    title: "Master",
    minPoints: 1000,
    maxPoints: 1999,
    benefits: ["Advanced automation", "Priority support"],
    icon: "👑"
  },
  {
    level: 6,
    title: "Legend",
    minPoints: 2000,
    maxPoints: 4999,
    benefits: ["Custom branding", "API access"],
    icon: "⭐"
  },
  {
    level: 7,
    title: "Champion",
    minPoints: 5000,
    maxPoints: 9999,
    benefits: ["White-label options", "Dedicated account manager"],
    icon: "🏆"
  },
  {
    level: 8,
    title: "Elite",
    minPoints: 10000,
    maxPoints: Infinity,
    benefits: ["Enterprise features", "Custom integrations"],
    icon: "💎"
  }
]

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  // Appointments Category
  {
    id: 'first_appointment',
    title: 'First Steps',
    description: 'Complete your first appointment',
    icon: '🎉',
    category: 'appointments',
    points: 10,
    requirement: 1,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'common'
  },
  {
    id: 'appointment_streak_7',
    title: 'Weekly Warrior',
    description: 'Complete appointments for 7 consecutive days',
    icon: '🔥',
    category: 'consistency',
    points: 50,
    requirement: 7,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'rare'
  },
  {
    id: 'appointment_milestone_50',
    title: 'Half Century',
    description: 'Complete 50 appointments',
    icon: '💯',
    category: 'appointments',
    points: 100,
    requirement: 50,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'epic'
  },
  {
    id: 'appointment_milestone_100',
    title: 'Century Club',
    description: 'Complete 100 appointments',
    icon: '🎯',
    category: 'appointments',
    points: 200,
    requirement: 100,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'epic'
  },
  
  // Clients Category
  {
    id: 'first_client',
    title: 'People Person',
    description: 'Serve your first client',
    icon: '👥',
    category: 'clients',
    points: 10,
    requirement: 1,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'common'
  },
  {
    id: 'client_milestone_25',
    title: 'Network Builder',
    description: 'Serve 25 unique clients',
    icon: '🌐',
    category: 'clients',
    points: 75,
    requirement: 25,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'rare'
  },
  {
    id: 'client_milestone_100',
    title: 'Community Leader',
    description: 'Serve 100 unique clients',
    icon: '👑',
    category: 'clients',
    points: 150,
    requirement: 100,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'epic'
  },
  
  // Revenue Category
  {
    id: 'first_revenue',
    title: 'Money Maker',
    description: 'Earn your first $100',
    icon: '💰',
    category: 'revenue',
    points: 20,
    requirement: 100,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'common'
  },
  {
    id: 'revenue_milestone_1000',
    title: 'Entrepreneur',
    description: 'Earn $1,000 in total revenue',
    icon: '💼',
    category: 'revenue',
    points: 100,
    requirement: 1000,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'rare'
  },
  {
    id: 'revenue_milestone_10000',
    title: 'Business Owner',
    description: 'Earn $10,000 in total revenue',
    icon: '🏢',
    category: 'revenue',
    points: 300,
    requirement: 10000,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'legendary'
  },
  
  // Growth Category
  {
    id: 'level_up_5',
    title: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    category: 'growth',
    points: 100,
    requirement: 5,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'rare'
  },
  {
    id: 'points_milestone_1000',
    title: 'Point Master',
    description: 'Earn 1,000 total points',
    icon: '🎯',
    category: 'growth',
    points: 50,
    requirement: 1000,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'rare'
  },
  
  // Special Category
  {
    id: 'perfect_week',
    title: 'Perfect Week',
    description: 'Complete all scheduled appointments in a week',
    icon: '✨',
    category: 'special',
    points: 150,
    requirement: 1,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'legendary'
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete 10 appointments before 9 AM',
    icon: '🌅',
    category: 'special',
    points: 75,
    requirement: 10,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'epic'
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete 10 appointments after 7 PM',
    icon: '🦉',
    category: 'special',
    points: 75,
    requirement: 10,
    currentProgress: 0,
    isUnlocked: false,
    rarity: 'epic'
  }
]

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      stats: {
        totalPoints: 0,
        currentLevel: 1,
        appointmentsCompleted: 0,
        clientsServed: 0,
        totalRevenue: 0,
        streakDays: 0,
        lastActivityDate: undefined
      },
      achievements: INITIAL_ACHIEVEMENTS,
      levels: LEVELS,

      addPoints: (points: number, reason: string) => {
        set(state => {
          const newTotalPoints = state.stats.totalPoints + points
          const newLevel = LEVELS.find(level => 
            newTotalPoints >= level.minPoints && newTotalPoints <= level.maxPoints
          )?.level || state.stats.currentLevel

          console.log(`🎯 +${points} points for ${reason}! Total: ${newTotalPoints}`)

          return {
            stats: {
              ...state.stats,
              totalPoints: newTotalPoints,
              currentLevel: newLevel
            }
          }
        })
        
        // Check for new achievements
        get().checkAchievements()
      },

      completeAppointment: () => {
        set(state => ({
          stats: {
            ...state.stats,
            appointmentsCompleted: state.stats.appointmentsCompleted + 1,
            lastActivityDate: new Date()
          }
        }))
        
        get().addPoints(10, 'completing appointment')
        get().updateStreak()
      },

      addNewClient: () => {
        set(state => ({
          stats: {
            ...state.stats,
            clientsServed: state.stats.clientsServed + 1
          }
        }))
        
        get().addPoints(15, 'serving new client')
      },

      addRevenue: (amount: number) => {
        set(state => ({
          stats: {
            ...state.stats,
            totalRevenue: state.stats.totalRevenue + amount
          }
        }))
        
        // Award points based on revenue (1 point per $10)
        const points = Math.floor(amount / 10)
        get().addPoints(points, `earning $${amount}`)
      },

      updateStreak: () => {
        const today = new Date()
        const lastActivity = get().stats.lastActivityDate
        
        if (!lastActivity) {
          set(state => ({
            stats: { ...state.stats, streakDays: 1, lastActivityDate: today }
          }))
          return
        }

        const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        
        set(state => ({
          stats: {
            ...state.stats,
            streakDays: daysDiff === 1 ? state.stats.streakDays + 1 : 1,
            lastActivityDate: today
          }
        }))
      },

      checkAchievements: () => {
        const state = get()
        const newlyUnlocked: Achievement[] = []

        const updatedAchievements = state.achievements.map(achievement => {
          if (achievement.isUnlocked) return achievement

          let currentProgress = 0
          
          // Update progress based on achievement type
          switch (achievement.id) {
            case 'first_appointment':
            case 'appointment_milestone_50':
            case 'appointment_milestone_100':
              currentProgress = state.stats.appointmentsCompleted
              break
            case 'first_client':
            case 'client_milestone_25':
            case 'client_milestone_100':
              currentProgress = state.stats.clientsServed
              break
            case 'first_revenue':
            case 'revenue_milestone_1000':
            case 'revenue_milestone_10000':
              currentProgress = state.stats.totalRevenue
              break
            case 'appointment_streak_7':
              currentProgress = state.stats.streakDays
              break
            case 'level_up_5':
              currentProgress = state.stats.currentLevel
              break
            case 'points_milestone_1000':
              currentProgress = state.stats.totalPoints
              break
            default:
              currentProgress = achievement.currentProgress
          }

          const updatedAchievement = {
            ...achievement,
            currentProgress
          }

          // Check if achievement should be unlocked
          if (currentProgress >= achievement.requirement && !achievement.isUnlocked) {
            updatedAchievement.isUnlocked = true
            updatedAchievement.unlockedAt = new Date()
            newlyUnlocked.push(updatedAchievement)
            
            // Award points for unlocking achievement
            set(state => ({
              stats: {
                ...state.stats,
                totalPoints: state.stats.totalPoints + achievement.points
              }
            }))

            console.log(`🏆 Achievement Unlocked: ${achievement.title} (+${achievement.points} points)`)
          }

          return updatedAchievement
        })

        set(state => ({
          achievements: updatedAchievements
        }))

        return newlyUnlocked
      },

      getCurrentLevel: () => {
        const state = get()
        return LEVELS.find(level => level.level === state.stats.currentLevel) || LEVELS[0]
      },

      getProgressToNextLevel: () => {
        const state = get()
        const currentLevel = get().getCurrentLevel()
        const nextLevel = LEVELS.find(level => level.level === currentLevel.level + 1)
        
        if (!nextLevel) {
          return { current: state.stats.totalPoints, required: currentLevel.maxPoints, percentage: 100 }
        }

        const current = state.stats.totalPoints - currentLevel.minPoints
        const required = nextLevel.minPoints - currentLevel.minPoints
        const percentage = Math.min((current / required) * 100, 100)

        return { current, required, percentage }
      },

      resetStats: () => {
        set({
          stats: {
            totalPoints: 0,
            currentLevel: 1,
            appointmentsCompleted: 0,
            clientsServed: 0,
            totalRevenue: 0,
            streakDays: 0,
            lastActivityDate: undefined
          },
          achievements: INITIAL_ACHIEVEMENTS
        })
      }
    }),
    {
      name: 'gamification-store'
    }
  )
)

