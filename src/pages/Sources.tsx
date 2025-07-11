import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useContentCuration } from '../hooks/useContentCuration'
import { contentScheduler } from '../services/contentScheduler'
import { getUserSources, updateSourcePriorities, createContentSource, deleteContentSource } from '../services/database'
import { ArrowLeft, Plus, Trash2, GripVertical, RefreshCw, Clock, Zap } from 'lucide-react'
import type { ContentSource } from '../types'

function Sources() {
  const [sources, setSources] = useState<ContentSource[]>([])
  const [newHandle, setNewHandle] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  
  const { user } = useAuth()
  const navigate = useNavigate()
  const { curateContent, loading: curating, error: curationError } = useContentCuration()

  useEffect(() => {
    if (!user) {
      navigate('/signin')
      return
    }
    
    loadSources()
    loadStats()
  }, [user, navigate])

  const loadSources = async () => {
    if (!user) return
    
    try {
      const userSources = await getUserSources(user.id)
      setSources(userSources)
    } catch (error) {
      console.error('Error loading sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!user) return
    
    try {
      const userStats = await contentScheduler.getUserStats(user.id)
      setStats(userStats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newHandle.trim()) return

    try {
      const newSource = await createContentSource({
        user_id: user.id,
        platform: 'twitter',
        handle: newHandle.trim().replace('@', ''),
        display_name: newDisplayName.trim() || newHandle.trim(),
        priority: sources.length + 1,
        is_active: true,
      })
      
      setSources([...sources, newSource])
      setNewHandle('')
      setNewDisplayName('')
    } catch (error) {
      console.error('Error adding source:', error)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await deleteContentSource(sourceId)
      setSources(sources.filter(s => s.id !== sourceId))
    } catch (error) {
      console.error('Error deleting source:', error)
    }
  }

  const handlePriorityChange = async (sourceId: string, newPriority: number) => {
    const updatedSources = sources.map(s => 
      s.id === sourceId ? { ...s, priority: newPriority } : s
    )
    
    setSources(updatedSources)
    
    try {
      await updateSourcePriorities(
        updatedSources.map(s => ({ id: s.id, priority: s.priority }))
      )
    } catch (error) {
      console.error('Error updating priorities:', error)
      // Revert on error
      loadSources()
    }
  }

  const handleManualCuration = async () => {
    try {
      const itemsAdded = await curateContent()
      await loadStats() // Refresh stats after curation
      alert(`Successfully curated content! Added ${itemsAdded} new items.`)
    } catch (error: any) {
      alert(`Curation failed: ${error.message}`)
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800'
      case 2: return 'bg-yellow-100 text-yellow-800'
      case 3: return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'High Priority'
      case 2: return 'Medium Priority' 
      case 3: return 'Low Priority'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Loading sources...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/feed')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">Content Sources</h1>
                <p className="text-sm text-gray-500">Manage your Twitter sources</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* API Usage Stats */}
        {stats && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center">
                <Zap className="w-4 h-4 mr-2 text-primary" />
                API Usage Today
              </h2>
              <button
                onClick={handleManualCuration}
                disabled={curating || stats.callsRemaining === 0}
                className="btn-primary text-sm disabled:opacity-50 flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${curating ? 'animate-spin' : ''}`} />
                <span>{curating ? 'Curating...' : 'Curate Now'}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{stats.callsUsedToday}</div>
                <div className="text-sm text-gray-500">Used Today</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">{stats.callsRemaining}</div>
                <div className="text-sm text-gray-500">Remaining</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.dailyLimit}</div>
                <div className="text-sm text-gray-500">Daily Limit</div>
              </div>
            </div>

            {curationError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{curationError}</p>
              </div>
            )}
          </div>
        )}

        {/* Add New Source */}
        <div className="card p-4">
          <h2 className="font-semibold mb-4 flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Twitter Source
          </h2>
          
          <form onSubmit={handleAddSource} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twitter Handle
              </label>
              <input
                type="text"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                placeholder="SkySportsNews"
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Sky Sports News"
                className="input-field"
              />
            </div>
            
            <button type="submit" className="btn-primary w-full">
              Add Source
            </button>
          </form>
        </div>

        {/* Sources List */}
        <div className="card p-4">
          <h2 className="font-semibold mb-4">Your Sources ({sources.length})</h2>
          
          {sources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No sources added yet.</p>
              <p className="text-sm">Add Twitter accounts to start curating content!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources
                .sort((a, b) => a.priority - b.priority)
                .map((source) => (
                <div key={source.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{source.display_name || source.handle}</span>
                      <span className="text-sm text-gray-500">@{source.handle}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(source.priority)}`}>
                        {getPriorityLabel(source.priority)}
                      </span>
                      <select
                        value={source.priority}
                        onChange={(e) => handlePriorityChange(source.id, parseInt(e.target.value))}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value={1}>Priority 1</option>
                        <option value={2}>Priority 2</option>
                        <option value={3}>Priority 3</option>
                      </select>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Jobs Info */}
        {stats?.nextScheduledJobs?.length > 0 && (
          <div className="card p-4">
            <h2 className="font-semibold mb-4 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Next Scheduled Updates
            </h2>
            
            <div className="space-y-2">
              {stats.nextScheduledJobs.map((job: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>Priority {job.priority} sources</span>
                  <span className="text-gray-500">
                    {new Date(job.scheduledFor).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority Explanation */}
        <div className="card p-4 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">How Priorities Work</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Priority 1:</strong> Most important sources (morning updates, 50% of API calls)</p>
            <p><strong>Priority 2:</strong> Regular sources (afternoon updates, 35% of API calls)</p>
            <p><strong>Priority 3:</strong> Supplementary sources (evening updates, 15% of API calls)</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Sources