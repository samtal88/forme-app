import { useSupabaseTest } from '../hooks/useSupabaseTest'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

function Landing() {
  const { connected, error } = useSupabaseTest()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/feed')
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-primary">ForMe</h1>
        <p className="text-xl text-gray-600 max-w-md">
          Your personal content curator for football fans
        </p>
        
        {/* Database connection status */}
        <div className="mb-4">
          {connected === null && (
            <p className="text-sm text-gray-500">Connecting to database...</p>
          )}
          {connected === true && (
            <p className="text-sm text-green-600">✅ Database connected</p>
          )}
          {connected === false && (
            <p className="text-sm text-red-600">❌ Database connection failed: {error}</p>
          )}
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/signup')}
            className="btn-primary w-full max-w-sm"
          >
            Get Started
          </button>
          <div className="space-x-4">
            <button 
              onClick={() => navigate('/signin')}
              className="text-primary hover:text-primary-dark"
            >
              Already have an account? Sign in
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Starting with Twitter, expanding to all platforms
          </p>
        </div>
      </div>
    </div>
  )
}

export default Landing