import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Trophy,
  Star,
  Target,
  TrendingUp,
  Award,
  Zap,
  ChevronRight
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useGamificationStore } from '../../store/gamification-store'

const GamificationWidget: React.FC = () => {
  const navigate = useNavigate()
  const {
    stats,
    achievements,
    getCurrentLevel,
    getProgressToNextLevel
  } = useGamificationStore()

  const currentLevel = getCurrentLevel()
  const progressToNext = getProgressToNextLevel()
  const recentAchievements = achievements
    .filter(a => a.isUnlocked)
    .sort((a, b) => {
      if (!a.unlockedAt || !b.unlockedAt) return 0
      return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    })
    .slice(0, 3)

  const unlockedCount = achievements.filter(a => a.isUnlocked).length
  const totalCount = achievements.length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Level Progress Card */}
      <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">{currentLevel.icon}</div>
              <div>
                <div className="text-lg font-bold text-yellow-800">
                  Level {currentLevel.level}
                </div>
                <div className="text-sm text-yellow-700">{currentLevel.title}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-800">{stats.totalPoints}</div>
              <div className="text-xs text-yellow-600">points</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress to Next Level */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-yellow-700">Next level progress</span>
              <span className="text-yellow-700 font-medium">
                {Math.round(progressToNext.percentage)}%
              </span>
            </div>
            <div className="w-full bg-yellow-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext.percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-orange-700">{stats.appointmentsCompleted}</div>
              <div className="text-xs text-orange-600">Appointments</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-700">{stats.streakDays}</div>
              <div className="text-xs text-orange-600">Day Streak</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-700">{stats.clientsServed}</div>
              <div className="text-xs text-orange-600">Clients</div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/achievements')}
            className="w-full bg-white/50 border-yellow-300 text-yellow-800 hover:bg-white/80"
          >
            View All Achievements
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Recent Achievements Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-purple-600" />
              <span>Recent Achievements</span>
            </div>
            <div className="text-sm text-gray-500">
              {unlockedCount}/{totalCount}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAchievements.length > 0 ? (
            <>
              {recentAchievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50"
                >
                  <div className="text-xl">{achievement.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {achievement.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {achievement.description}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <Star className="h-3 w-3" />
                    <span className="text-xs font-medium">{achievement.points}</span>
                  </div>
                </motion.div>
              ))}
              
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/achievements')}
                  className="w-full"
                >
                  View All Achievements
                  <Award className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <div className="text-sm text-gray-500 mb-3">
                Complete your first appointment to start earning achievements!
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/appointments')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Target className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default GamificationWidget

