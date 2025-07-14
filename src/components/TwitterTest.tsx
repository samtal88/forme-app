import { useState } from 'react'
import { twitterAPI } from '../services/twitter'

export function TwitterTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const testAPI = async () => {
    setLoading(true)
    setResult('')
    
    try {
      // Test with a simple Twitter handle
      const tweets = await twitterAPI.getUserTweets('premierleague', 5)
      setResult(`Success! Fetched ${tweets.length} tweets from @premierleague`)
      console.log('Tweets:', tweets)
    } catch (error: any) {
      setResult(`Error: ${error.message}`)
      console.error('Twitter API Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-4 mb-4">
      <h3 className="font-semibold mb-3">Twitter API Test</h3>
      <button 
        onClick={testAPI}
        disabled={loading}
        className="btn-primary disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Twitter API'}
      </button>
      {result && (
        <div className={`mt-3 p-3 rounded ${
          result.startsWith('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {result}
        </div>
      )}
    </div>
  )
}