import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Settings, RefreshCw, Menu } from 'lucide-react'

function Feed() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/signin')
    }
  }, [user, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
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
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="w-5 h-5" />
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
          {/* Placeholder content */}
          <div className="card p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Welcome to ForMe!</h2>
            <p className="text-gray-600 mb-4">
              Your personalized football content feed is being set up. 
              Content will appear here once we start fetching from your sources.
            </p>
            <button 
              onClick={() => navigate('/sources')}
              className="btn-primary"
            >
              Manage Sources
            </button>
          </div>

          {/* Sample content cards for UI preview */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-semibold">Sample Source {i}</span>
                    <span className="text-sm text-gray-500">@source{i}</span>
                    <span className="text-sm text-gray-500">·</span>
                    <span className="text-sm text-gray-500">2h</span>
                  </div>
                  <p className="text-gray-900 mb-3">
                    This is a sample content item to show how your curated feed will look. 
                    Real content from your selected sources will appear here.
                  </p>
                  <div className="flex items-center space-x-4 text-gray-500 text-sm">
                    <button className="hover:text-primary">💬 24</button>
                    <button className="hover:text-primary">🔄 8</button>
                    <button className="hover:text-primary">❤️ 156</button>
                    <button className="hover:text-primary">📤</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Feed