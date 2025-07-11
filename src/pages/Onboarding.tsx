import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getTeams, createUserPreferences, createContentSource } from '../services/database'
import { Check, ChevronRight, Star } from 'lucide-react'
import type { Team } from '../types'

const STEPS = ['welcome', 'team', 'sources', 'ready'] as const
type Step = typeof STEPS[number]

const DEFAULT_SOURCES = [
  { handle: 'SkySportsNews', name: 'Sky Sports News', priority: 1 },
  { handle: 'FabrizioRomano', name: 'Fabrizio Romano', priority: 2 },
  { handle: 'LUFC', name: 'Leeds United', priority: 2 },
  { handle: 'RangersFC', name: 'Rangers FC', priority: 2 },
  { handle: 'ibroxrocks', name: 'Ibrox Rocks', priority: 3 },
]

function Onboarding() {
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/signin')
      return
    }
    
    loadTeams()
  }, [user, navigate])

  const loadTeams = async () => {
    try {
      const teamsData = await getTeams()
      setTeams(teamsData)
    } catch (error) {
      console.error('Error loading teams:', error)
    }
  }

  const handleNext = () => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1])
    }
  }

  const handleComplete = async () => {
    if (!user || !selectedTeam) return
    
    setLoading(true)
    try {
      // Create user preferences
      await createUserPreferences({
        user_id: user.id,
        favorite_team_id: selectedTeam.id,
        theme: 'light',
        notifications_enabled: true,
        email_digest: false,
      })

      // Create default content sources
      const sourcesToCreate = DEFAULT_SOURCES.filter(source => 
        selectedSources.includes(source.handle)
      )

      for (const source of sourcesToCreate) {
        await createContentSource({
          user_id: user.id,
          platform: 'twitter',
          handle: source.handle,
          display_name: source.name,
          priority: source.priority,
          is_active: true,
        })
      }

      navigate('/feed')
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSource = (handle: string) => {
    setSelectedSources(prev => 
      prev.includes(handle) 
        ? prev.filter(h => h !== handle)
        : [...prev, handle]
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-primary">Welcome to ForMe!</h1>
              <p className="text-xl text-gray-600 max-w-md mx-auto">
                Let's set up your personalized football content feed in just a few steps.
              </p>
            </div>
            <div className="space-y-4 max-w-sm mx-auto">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">1</div>
                <span>Choose your favorite team</span>
              </div>
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">2</div>
                <span>Select your content sources</span>
              </div>
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">3</div>
                <span>Start enjoying curated content</span>
              </div>
            </div>
            <button onClick={handleNext} className="btn-primary">
              Get Started <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )

      case 'team':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Team</h2>
              <p className="text-gray-600">
                Select your favorite team to get personalized content and filter rival team news.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedTeam?.id === team.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {team.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{team.name}</div>
                      <div className="text-sm text-gray-500">{team.league}</div>
                    </div>
                    {selectedTeam?.id === team.id && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handleNext}
                disabled={!selectedTeam}
                className="btn-primary disabled:opacity-50"
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )

      case 'sources':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Content Sources</h2>
              <p className="text-gray-600">
                Choose which Twitter accounts you want to follow for {selectedTeam?.name} content.
              </p>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              {DEFAULT_SOURCES.map((source) => (
                <button
                  key={source.handle}
                  onClick={() => toggleSource(source.handle)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedSources.includes(source.handle)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="font-semibold">{source.name}</div>
                      <div className="text-sm text-gray-500">@{source.handle}</div>
                      <div className="flex items-center mt-1">
                        {Array.from({ length: source.priority }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">Priority {source.priority}</span>
                      </div>
                    </div>
                    {selectedSources.includes(source.handle) && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handleNext}
                disabled={selectedSources.length === 0}
                className="btn-primary disabled:opacity-50"
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )

      case 'ready':
        return (
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">You're all set!</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Your personalized feed is ready with content from {selectedSources.length} sources 
                tailored for {selectedTeam?.name} fans.
              </p>
            </div>

            <div className="card p-4 max-w-sm mx-auto">
              <h3 className="font-semibold mb-2">Your Setup:</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>Team: {selectedTeam?.name}</div>
                <div>Sources: {selectedSources.length} selected</div>
                <div>Ready to curate content!</div>
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Start Using ForMe'}
            </button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Progress indicator */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {STEPS.map((step, index) => {
                const isActive = step === currentStep
                const isCompleted = STEPS.indexOf(currentStep) > index
                
                return (
                  <div
                    key={step}
                    className={`w-3 h-3 rounded-full ${
                      isCompleted ? 'bg-green-500' : isActive ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )
              })}
            </div>
            <div className="text-sm text-gray-500">
              Step {STEPS.indexOf(currentStep) + 1} of {STEPS.length}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {renderStep()}
      </div>
    </div>
  )
}

export default Onboarding