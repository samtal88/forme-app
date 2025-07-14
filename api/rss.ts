import type { VercelRequest, VercelResponse } from '@vercel/node'

interface RSSItem {
  title: string
  description: string
  link: string
  pubDate: string
  guid: string
  author?: string
}

interface RSSFeed {
  title: string
  description: string
  link: string
  items: RSSItem[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { feedUrl } = req.query

  if (!feedUrl || typeof feedUrl !== 'string') {
    return res.status(400).json({ error: 'feedUrl parameter required' })
  }

  try {
    console.log(`Fetching RSS feed: ${feedUrl}`)
    
    // Fetch the RSS feed with timeout and better error handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ForMe Football App/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body')
      console.error(`RSS fetch failed: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const xmlText = await response.text()
    console.log(`RSS XML length: ${xmlText.length}`)
    
    if (!xmlText || xmlText.length === 0) {
      throw new Error('Empty response from RSS feed')
    }
    
    // Check if response looks like XML
    if (!xmlText.trim().startsWith('<')) {
      console.error('Response does not appear to be XML:', xmlText.substring(0, 200))
      throw new Error('Response is not valid XML')
    }
    
    // Parse RSS XML (basic parsing without external libraries)
    const feed = parseRSSXML(xmlText)
    
    return res.status(200).json({
      success: true,
      feed,
      itemCount: feed.items.length
    })

  } catch (error: any) {
    console.error('RSS Feed Error:', error)
    
    let errorMessage = error.message
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - RSS feed took too long to respond'
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'RSS feed URL not found - check the URL is correct'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - RSS feed server is not accessible'
    }
    
    return res.status(500).json({ 
      error: `Failed to fetch RSS feed: ${errorMessage}`,
      details: error.code || error.name || 'Unknown error'
    })
  }
}

function parseRSSXML(xmlText: string): RSSFeed {
  // Basic XML parsing without external dependencies
  // This is a simplified parser - in production, you might want xml2js or similar
  
  try {
    // Extract channel info
    const titleMatch = xmlText.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i)
    const descMatch = xmlText.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/i)
    const linkMatch = xmlText.match(/<link>(.*?)<\/link>/i)
    
    const channelTitle = titleMatch?.[1] || titleMatch?.[2] || 'Unknown Feed'
    const channelDesc = descMatch?.[1] || descMatch?.[2] || 'RSS Feed'
    const channelLink = linkMatch?.[1] || ''
    
    // Extract items
    const items: RSSItem[] = []
    const itemMatches = xmlText.match(/<item[^>]*>.*?<\/item>/gis)
    
    if (itemMatches) {
      for (const itemXml of itemMatches.slice(0, 20)) { // Limit to 20 items
        const item = parseRSSItem(itemXml)
        if (item) {
          items.push(item)
        }
      }
    }
    
    return {
      title: channelTitle,
      description: channelDesc,
      link: channelLink,
      items
    }
    
  } catch (error) {
    console.error('XML parsing error:', error)
    throw new Error('Failed to parse RSS XML')
  }
}

function parseRSSItem(itemXml: string): RSSItem | null {
  try {
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/is)
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/is)
    const linkMatch = itemXml.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>|<link>(.*?)<\/link>/is)
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/is)
    const guidMatch = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/is)
    const authorMatch = itemXml.match(/<author>(.*?)<\/author>|<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>|<dc:creator>(.*?)<\/dc:creator>/is)
    
    const title = titleMatch?.[1] || titleMatch?.[2] || ''
    const description = descMatch?.[1] || descMatch?.[2] || ''
    const link = linkMatch?.[1] || linkMatch?.[2] || ''
    const pubDate = pubDateMatch?.[1] || new Date().toISOString()
    const guid = guidMatch?.[1] || link || `item-${Date.now()}-${Math.random()}`
    const author = authorMatch?.[1] || authorMatch?.[2] || authorMatch?.[3] || ''
    
    if (!title && !description) {
      return null // Skip items without content
    }
    
    return {
      title: cleanText(title),
      description: cleanText(description),
      link: link.trim(),
      pubDate: pubDate.trim(),
      guid: guid.trim(),
      author: cleanText(author)
    }
    
  } catch (error) {
    console.error('Error parsing RSS item:', error)
    return null
  }
}

function cleanText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}