import { useState } from 'react'
import { rssService, rssCuration } from '../services/rss'
import { useAuth } from '../contexts/AuthContext'
import { getUserSources, saveContentItems } from '../services/database'
import type { RSSSource } from '../types'

export function RSSTest() {
  const { user } = useAuth()
  const [testFeedUrl, setTestFeedUrl] = useState('https://feeds.skysports.com/feeds/11095')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const testRSSFeed = async () => {
    if (!testFeedUrl.trim()) {
      setResult('Please enter a RSS feed URL')
      return
    }

    setLoading(true)
    setResult('Testing RSS feed...')

    try {
      // Test fetching the RSS feed
      const feed = await rssService.fetchRSSFeed(testFeedUrl)
      
      setResult(`✅ RSS Feed Test Success!
Feed Title: ${feed.title}
Feed Description: ${feed.description}
Items Count: ${feed.items.length}
Sample Items:
${feed.items.slice(0, 3).map((item, i) => 
  `${i + 1}. ${item.title} (${item.pubDate})`
).join('\n')}`)

    } catch (error: any) {
      console.error('RSS test error:', error)
      setResult(`❌ RSS Feed Test Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testRSSCuration = async () => {
    if (!user) {
      setResult('Please sign in to test RSS curation')
      return
    }

    setLoading(true)
    setResult('Testing RSS curation...')

    try {
      // Get user's RSS sources
      const userSources = await getUserSources(user.id)
      const rssSources = userSources.filter(s => s.platform === 'rss') as RSSSource[]
      
      if (rssSources.length === 0) {
        setResult('❌ No RSS sources found. Add some RSS feeds in Sources page first.')
        return
      }

      setResult(`Found ${rssSources.length} RSS sources. Starting curation...`)

      // Run RSS curation
      const contentItems = await rssCuration.curateRSSContent(
        rssSources,
        (status) => setResult(prev => prev + '\n' + status)
      )

      if (contentItems.length > 0) {
        // Save to database
        await saveContentItems(contentItems)
        setResult(prev => prev + `\n✅ Successfully saved ${contentItems.length} RSS items to database!`)
      } else {
        setResult(prev => prev + '\n⚠️ No RSS content items were generated.')
      }

    } catch (error: any) {
      console.error('RSS curation test error:', error)
      setResult(prev => prev + `\n❌ RSS Curation Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-4 bg-orange-50 border-orange-200">
      <h3 className="font-semibold text-orange-900 mb-3">RSS Feed Testing</h3>
      
      {/* Test Single RSS Feed */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-orange-800 mb-1">
            Test RSS Feed URL
          </label>
          <input
            type="url"
            value={testFeedUrl}
            onChange={(e) => setTestFeedUrl(e.target.value)}
            placeholder="https://feeds.skysports.com/feeds/11095"
            className="w-full px-3 py-2 border border-orange-300 rounded-md text-sm"
          />
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={testRSSFeed}
            disabled={loading}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test RSS Feed'}
          </button>
          
          <button
            onClick={testRSSCuration}
            disabled={loading || !user}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Full RSS Curation'}
          </button>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-white border border-orange-200 rounded-md p-3 text-sm">
          <pre className="whitespace-pre-wrap text-gray-700">{result}</pre>
        </div>
      )}

      {/* Sample RSS Feeds */}
      <div className="mt-4 pt-3 border-t border-orange-200">
        <p className="text-sm text-orange-800 font-medium mb-2">Sample RSS Feeds to Test:</p>
        <div className="space-y-1 text-xs text-orange-700">
          <button 
            onClick={() => setTestFeedUrl('https://feeds.skysports.com/feeds/11095')}
            className="block hover:underline text-left"
          >
            Sky Sports Football: https://feeds.skysports.com/feeds/11095
          </button>
          <button 
            onClick={() => setTestFeedUrl('https://www.espn.com/espn/rss/news')}
            className="block hover:underline text-left"
          >
            ESPN News: https://www.espn.com/espn/rss/news
          </button>
          <button 
            onClick={() => setTestFeedUrl('https://www.bbc.co.uk/sport/football/rss.xml')}
            className="block hover:underline text-left"
          >
            BBC Sport Football: https://www.bbc.co.uk/sport/football/rss.xml
          </button>
        </div>
      </div>
    </div>
  )
}