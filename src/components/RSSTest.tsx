import { useState } from 'react'
import { rssCuration } from '../services/rss'
import { useAuth } from '../contexts/AuthContext'
import { getUserSources, createContentItem } from '../services/database'
import type { RSSSource, RSSItem } from '../types'

export function RSSTest() {
  const { user } = useAuth()
  const [testFeedUrl, setTestFeedUrl] = useState('https://www.theverge.com/rss/index.xml')
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
      const response = await fetch(`/api/rss?feedUrl=${encodeURIComponent(testFeedUrl)}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'RSS fetch failed')
      }
      
      const feed = data.feed
      
      setResult(`✅ RSS Feed Test Success!
Feed Title: ${feed.title}
Feed Description: ${feed.description}
Items Count: ${feed.items.length}
Sample Items:
${feed.items.slice(0, 3).map((item: RSSItem, i: number) => 
  `${i + 1}. ${item.title} (${item.pubDate})`
).join('\n')}

🔍 Debug Info:
- XML Length: ${data.debug?.xmlLength || 'N/A'}
- Feed Type: ${data.debug?.feedType || 'N/A'}
- Entry Tags Found: ${data.debug?.entryCount || 0}
- Entry Tags with Space: ${data.debug?.entryWithSpaceCount || 0}
- Has Entry Tags: ${data.debug?.hasEntryTags || false}
- XML Preview: ${data.debug?.xmlPreview || 'N/A'}
- XML Middle Preview: ${data.debug?.xmlMiddlePreview || 'N/A'}`)

    } catch (error: any) {
      console.error('RSS test error:', error)
      setResult(`❌ RSS Feed Test Failed: ${error.message}

Debug Info:
- URL: ${testFeedUrl}
- Error Type: ${error.name || 'Unknown'}
- This might be due to CORS restrictions or the RSS feed being unavailable
- Try a different RSS feed URL from the samples below`)
    } finally {
      setLoading(false)
    }
  }

  const testDirectFetch = async () => {
    if (!testFeedUrl.trim()) {
      setResult('Please enter a RSS feed URL')
      return
    }

    setLoading(true)
    setResult('Testing direct fetch (may fail due to CORS)...')

    try {
      const response = await fetch(testFeedUrl, {
        mode: 'no-cors',
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      })
      
      setResult(`✅ Direct fetch successful! Status: ${response.status}
Note: Due to CORS, we can't read the content, but the URL is reachable.
Try the "Test RSS Feed" button to test via our API proxy.`)

    } catch (error: any) {
      setResult(`❌ Direct fetch failed: ${error.message}
This URL may be completely unreachable or have strict CORS policies.`)
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
        let savedCount = 0
        for (const item of contentItems) {
          try {
            await createContentItem(item)
            savedCount++
          } catch (error) {
            console.error('Error saving content item:', error)
          }
        }
        setResult(prev => prev + `\n✅ Successfully saved ${savedCount}/${contentItems.length} RSS items to database!`)
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
            placeholder="https://www.theverge.com/rss/index.xml"
            className="w-full px-3 py-2 border border-orange-300 rounded-md text-sm"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={testRSSFeed}
            disabled={loading}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test RSS Feed'}
          </button>
          
          <button
            onClick={testDirectFetch}
            disabled={loading}
            className="btn-secondary text-sm disabled:opacity-50 bg-gray-100"
          >
            {loading ? 'Testing...' : 'Test Direct Fetch'}
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
            onClick={() => setTestFeedUrl('https://www.theverge.com/rss/index.xml')}
            className="block hover:underline text-left"
          >
            The Verge: https://www.theverge.com/rss/index.xml
          </button>
          <button 
            onClick={() => setTestFeedUrl('https://feeds.feedburner.com/TechCrunch')}
            className="block hover:underline text-left"
          >
            TechCrunch: https://feeds.feedburner.com/TechCrunch
          </button>
          <button 
            onClick={() => setTestFeedUrl('https://rss.cnn.com/rss/edition.rss')}
            className="block hover:underline text-left"
          >
            CNN: https://rss.cnn.com/rss/edition.rss
          </button>
          <button 
            onClick={() => setTestFeedUrl('https://techcrunch.com/feed')}
            className="block hover:underline text-left"
          >
            TechCrunch Direct: https://techcrunch.com/feed
          </button>
        </div>
      </div>
    </div>
  )
}