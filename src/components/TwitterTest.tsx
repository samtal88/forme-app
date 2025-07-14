import { useState } from 'react'
import { env } from '../utils/env'

export function TwitterTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const testAPI = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('Testing Twitter API via Vercel proxy...')
      
      // Test our Vercel API proxy
      const url = new URL('/api/twitter', window.location.origin)
      url.searchParams.append('username', 'premierleague')
      url.searchParams.append('maxResults', '5')
      
      const response = await fetch(url.toString())
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('API Response:', data)
      
      if (data.success) {
        setResult(`Success! Fetched ${data.count} tweets from @premierleague via Vercel API`)
      } else {
        setResult(`Error: ${data.error}`)
      }
      
    } catch (error: any) {
      console.error('Full Twitter API Error:', error)
      setResult(`Error: ${error.message}`)
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