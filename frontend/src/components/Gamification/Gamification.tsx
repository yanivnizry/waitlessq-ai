import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useRTL } from '../../hooks/useRTL'
import { 
  Trophy,
  Star,
  Target,
  TrendingUp,
  Award,
  Users,
  DollarSign,
  Calendar,
  Zap,
  Crown,
  Medal,
  Gift,
  RotateCcw
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../../lib/utils'
import { useGamificationStore, Achievement } from '../../store/gamification-store'

const Gamification: React.FC = () => {
  const { t } = useTranslation()
  const { isRTL, getFlexDirection, getMargin } = useRTL()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const {
    stats,
    achievements,
    getCurrentLevel,
    getProgressToNextLevel,
    resetStats
  } = useGamificationStore()

  const currentLevel = getCurrentLevel()
  const progressToNext = getProgressToNextLevel()

  const categories = [
    { id: 'all', name: 'All', icon: Trophy },
    { id: 'appointments', name: 'Appointments', icon: Calendar },
    { id: 'clients', name: 'Clients', icon: Users },
    { id: 'revenue', name: 'Revenue', icon: DollarSign },
    { id: 'consistency', name: 'Consistency', icon: Target },
    { id: 'growth', name: 'Growth', icon: TrendingUp },
    { id: 'special', name: 'Special', icon: Star }
  ]

  const filteredAchievements = achievements.filter(achievement =>
    selectedCategory === 'all' || achievement.category === selectedCategory
  )

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50'
      case 'rare': return 'border-blue-300 bg-blue-50'
      case 'epic': return 'border-purple-300 bg-purple-50'
      case 'legendary': return 'border-yellow-300 bg-yellow-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const getRarityBadgeColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500 text-white'
      case 'rare': return 'bg-blue-500 text-white'
      case 'epic': return 'bg-purple-500 text-white'
      case 'legendary': return 'bg-yellow-500 text-black'
      default: return 'bg-gray-500 text-white'
    }
  }

  const unlockedAchievements = achievements.filter(a => a.isUnlocked)
  const totalAchievements = achievements.length
  const completionRate = Math.round((unlockedAchievements.length / totalAchievements) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={cn(getFlexDirection("flex items-center gap-4"))}>
          <Trophy className="h-8 w-8 text-yellow-600" />
          <h1 className="text-3xl font-bold text-gray-900">{t('gamification.title')}</h1>
        </div>
        
        <Button
          variant="outline"
          onClick={resetStats}
          className="text-gray-600 gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {t('gamification.resetProgress')}
        </Button>
      </div>

      {/* Level and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Level */}
        <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">{currentLevel.icon}</div>
            <CardTitle className="text-2xl text-yellow-800">
              {t('gamification.level')} {currentLevel.level}
            </CardTitle>
            <CardDescription className="text-yellow-700 font-medium">
              {currentLevel.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('gamification.progressToNext')}</span>
                <span>{Math.round(progressToNext.percentage)}%</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-3">
                <motion.div
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext.percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="text-xs text-yellow-700">
                {progressToNext.current} / {progressToNext.required} points
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Your Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('gamification.totalPoints')}</span>
              <span className="font-bold text-blue-600">{stats.totalPoints}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Appointments</span>
              <span className="font-bold">{stats.appointmentsCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Clients Served</span>
              <span className="font-bold">{stats.clientsServed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Revenue</span>
              <span className="font-bold text-green-600">
                ${stats.totalRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Streak</span>
              <span className="font-bold text-orange-600">{stats.streakDays} days</span>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Achievement Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {unlockedAchievements.length}/{totalAchievements}
              </div>
              <div className="text-sm text-gray-600">{t('gamification.achievementsUnlocked')}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span>{completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  className="bg-gradient-to-r from-purple-400 to-pink-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="font-bold text-gray-600">
                  {achievements.filter(a => a.rarity === 'common' && a.isUnlocked).length}
                </div>
                <div className="text-gray-500">Common</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-blue-600">
                  {achievements.filter(a => a.rarity === 'rare' && a.isUnlocked).length}
                </div>
                <div className="text-gray-500">Rare</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-purple-600">
                  {achievements.filter(a => a.rarity === 'epic' && a.isUnlocked).length}
                </div>
                <div className="text-gray-500">Epic</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-yellow-600">
                  {achievements.filter(a => a.rarity === 'legendary' && a.isUnlocked).length}
                </div>
                <div className="text-gray-500">Legendary</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            <span>Current Level Benefits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentLevel.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <Zap className="h-4 w-4 text-green-500" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.name}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAchievements.map((achievement) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card 
              className={`h-full transition-all duration-300 ${
                achievement.isUnlocked 
                  ? `border-2 ${getRarityColor(achievement.rarity)} shadow-lg` 
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <CardHeader className="text-center pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-xs px-2 py-1 rounded-full ${getRarityBadgeColor(achievement.rarity)}`}>
                    {achievement.rarity.toUpperCase()}
                  </div>
                  {achievement.isUnlocked && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Medal className="h-4 w-4" />
                      <span className="text-xs font-medium">UNLOCKED</span>
                    </div>
                  )}
                </div>
                
                <div className="text-4xl mb-2">
                  {achievement.isUnlocked ? achievement.icon : '🔒'}
                </div>
                
                <CardTitle className={`text-lg ${achievement.isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                  {achievement.title}
                </CardTitle>
                
                <CardDescription className={achievement.isUnlocked ? 'text-gray-600' : 'text-gray-400'}>
                  {achievement.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
                      {Math.min(achievement.currentProgress, achievement.requirement)} / {achievement.requirement}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${
                        achievement.isUnlocked 
                          ? 'bg-green-500' 
                          : 'bg-blue-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.min((achievement.currentProgress / achievement.requirement) * 100, 100)}%` 
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Points and Unlock Date */}
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{achievement.points} points</span>
                  </div>
                  
                  {achievement.isUnlocked && achievement.unlockedAt && (
                    <div className="text-xs text-gray-500">
                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions for Testing */}
      <Card className="border-2 border-dashed border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-purple-600" />
            <span>Test Gamification (Development)</span>
          </CardTitle>
          <CardDescription>
            Use these buttons to test the gamification system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => useGamificationStore.getState().completeAppointment()}
            >
              Complete Appointment
            </Button>
            <Button
              size="sm"
              onClick={() => useGamificationStore.getState().addNewClient()}
            >
              Add New Client
            </Button>
            <Button
              size="sm"
              onClick={() => useGamificationStore.getState().addRevenue(100)}
            >
              Add $100 Revenue
            </Button>
            <Button
              size="sm"
              onClick={() => useGamificationStore.getState().addPoints(50, 'testing')}
            >
              Add 50 Points
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Gamification

