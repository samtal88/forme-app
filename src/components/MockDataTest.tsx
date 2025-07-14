import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createContentItem } from '../services/database'

export function MockDataTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const { user } = useAuth()

  const addMockData = async () => {
    if (!user) {
      setResult('Error: User not authenticated')
      return
    }

    setLoading(true)
    setResult('')
    
    try {
      // Mock Twitter content - simulating real tweets
      const mockTweets = [
        {
          source_id: 'mock-source-1',
          platform_id: 'mock-tweet-1',
          content_text: '🚨 BREAKING: Manchester United confirm signing of new midfielder for £50M! Deal includes performance bonuses. Official announcement coming soon! #MUFC #TransferNews',
          author_handle: 'skysportsnews',
          posted_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
          engagement_count: 1247,
          is_breaking_news: true,
          content_type: 'breaking',
          media_urls: [],
          external_url: 'https://twitter.com/skysportsnews/status/mock-tweet-1'
        },
        {
          source_id: 'mock-source-2', 
          platform_id: 'mock-tweet-2',
          content_text: 'Liverpool looking strong in training ahead of this weekend\'s big match. Salah and Mané working on their finishing 🔥⚽ #LFC #TrainingUpdate',
          author_handle: 'lfc',
          posted_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          engagement_count: 892,
          is_breaking_news: false,
          content_type: 'team',
          media_urls: [],
          external_url: 'https://twitter.com/lfc/status/mock-tweet-2'
        },
        {
          source_id: 'mock-source-3',
          platform_id: 'mock-tweet-3', 
          content_text: 'Here we go! Arsenal have reached full agreement with Brighton for defender. €45m + add-ons, medical scheduled for next week. Done deal! 🔴⚪ #AFC #TransferUpdate',
          author_handle: 'fabrizioromano',
          posted_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
          engagement_count: 2156,
          is_breaking_news: true,
          content_type: 'transfer',
          media_urls: [],
          external_url: 'https://twitter.com/fabrizioromano/status/mock-tweet-3'
        },
        {
          source_id: 'mock-source-4',
          platform_id: 'mock-tweet-4',
          content_text: 'What a goal! Championship is heating up as Leeds United score a screamer in the 89th minute to secure all 3 points! ⚽🔥 #LUFC #Championship',
          author_handle: 'lufc',
          posted_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
          engagement_count: 567,
          is_breaking_news: false,
          content_type: 'general',
          media_urls: [],
          external_url: 'https://twitter.com/lufc/status/mock-tweet-4'
        }
      ]

      let created = 0
      for (const tweet of mockTweets) {
        try {
          await createContentItem(tweet)
          created++
        } catch (error) {
          console.warn('Failed to create mock item:', error)
        }
      }

      setResult(`Success! Added ${created} mock tweets to your feed`)
      
    } catch (error: any) {
      console.error('Mock data error:', error)
      setResult(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-4 mb-4 bg-blue-50 border-blue-200">
      <h3 className="font-semibold mb-3">Mock Data Test</h3>
      <p className="text-sm text-blue-700 mb-3">
        Add sample football tweets to test the feed while Twitter API is rate limited
      </p>
      <button 
        onClick={addMockData}
        disabled={loading || !user}
        className="btn-secondary disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Mock Tweets'}
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