import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Settings, RefreshCw, Menu } from 'lucide-react'
import { TwitterTest } from '../components/TwitterTest'
import { useContentCuration } from '../hooks/useContentCuration'
import { getUserContent, getUserSources } from '../services/database'
import type { ContentItem, ContentSource, UserInteraction } from '../types'

type FeedItem = ContentItem & { 
  content_sources: ContentSource,
  user_interactions: UserInteraction[]
}

function Feed() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<ContentSource[]>([])
  const curation = useContentCuration()

  useEffect(() => {
    if (!user) {
      navigate('/signin')
      return
    }
    loadFeedContent()
    loadSources()
  }, [user, navigate])

  const loadSources = async () => {
    if (!user) return
    
    try {
      const userSources = await getUserSources(user.id)
      setSources(userSources)
      console.log('User sources loaded:', userSources)
    } catch (error) {
      console.error('Error loading sources:', error)
    }
  }

  const loadFeedContent = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const content = await getUserContent(user.id)
      setFeedItems(content)
    } catch (error) {
      console.error('Error loading feed content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!user) return
    
    try {
      console.log('Starting content curation...')
      const itemsCreated = await curation.curateContent()
      console.log(`Curation completed. Items created: ${itemsCreated}`)
      
      console.log('Reloading feed content...')
      await loadFeedContent()
      console.log('Feed content reloaded')
    } catch (error) {
      console.error('Error refreshing content:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'now'
    if (diffInHours < 24) return `${diffInHours}h`
    return `${Math.floor(diffInHours / 24)}d`
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">ForMe</h1>
              <p className="text-sm text-gray-500">Last updated 2h ago</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleRefresh}
                disabled={curation.loading}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${curation.loading ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => navigate('/sources')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSignOut}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Feed Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="space-y-4">
          {/* Twitter API Test Component */}
          <TwitterTest />

          {/* Debug: Show Sources */}
          <div className="card p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">Debug: Your Sources ({sources.length})</h3>
            {sources.length > 0 ? (
              <div className="space-y-1">
                {sources.map(source => (
                  <div key={source.id} className="text-sm">
                    @{source.handle} - Priority {source.priority} - {source.is_active ? '✅ Active' : '❌ Inactive'}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No sources found. Add some in Sources page.</p>
            )}
          </div>

          {/* Curation Status */}
          {curation.error && (
            <div className="card p-4 bg-red-50 border-red-200">
              <p className="text-red-700">{curation.error}</p>
            </div>
          )}

          {/* Feed Items */}
          {loading ? (
            <div className="card p-6 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading feed...</p>
            </div>
          ) : feedItems.length > 0 ? (
            feedItems.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-600">
                      {item.content_sources.handle[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold">
                        {item.content_sources.display_name || item.content_sources.handle}
                      </span>
                      <span className="text-sm text-gray-500">@{item.author_handle}</span>
                      <span className="text-sm text-gray-500">·</span>
                      <span className="text-sm text-gray-500">{formatTimeAgo(item.posted_at)}</span>
                      {item.is_breaking_news && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Breaking
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 mb-3 whitespace-pre-wrap">
                      {item.content_text}
                    </p>
                    <div className="flex items-center space-x-4 text-gray-500 text-sm">
                      <span>💬 {Math.floor(item.engagement_count * 0.1)}</span>
                      <span>🔄 {Math.floor(item.engagement_count * 0.05)}</span>
                      <span>❤️ {item.engagement_count}</span>
                      <a 
                        href={item.external_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        📤
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Welcome to ForMe!</h2>
              <p className="text-gray-600 mb-4">
                Your personalized football content feed is ready. 
                Click refresh to start fetching content from your sources, or add some sources first.
              </p>
              <div className="space-x-2">
                <button 
                  onClick={() => navigate('/sources')}
                  className="btn-primary"
                >
                  Manage Sources
                </button>
                <button 
                  onClick={handleRefresh}
                  disabled={curation.loading}
                  className="btn-secondary disabled:opacity-50"
                >
                  {curation.loading ? 'Fetching...' : 'Fetch Content'}
                </button>
              </div>
            </div>
          )}

          {/* API Usage Info */}
          <div className="card p-4 bg-blue-50 border-blue-200">
            <p className="text-blue-700 text-sm">
              API calls remaining today: {curation.remainingCalls}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Feed