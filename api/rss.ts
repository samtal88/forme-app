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
  // Enhanced XML parsing to handle RSS 2.0, RSS 1.0, and Atom feeds
  
  try {
    console.log('Parsing XML, length:', xmlText.length)
    console.log('XML preview:', xmlText.substring(0, 500))
    
    // Detect feed type
    const isAtom = xmlText.includes('<feed') || xmlText.includes('xmlns="http://www.w3.org/2005/Atom"')
    const isRSS1 = xmlText.includes('xmlns="http://purl.org/rss/1.0/"')
    
    console.log('Feed type detection - Atom:', isAtom, 'RSS1:', isRSS1)
    
    let channelTitle = 'Unknown Feed'
    let channelDesc = 'RSS Feed'
    let channelLink = ''
    
    if (isAtom) {
      // Parse Atom feed
      const titleMatch = xmlText.match(/<title[^>]*>(.*?)<\/title>/is)
      const subtitleMatch = xmlText.match(/<subtitle[^>]*>(.*?)<\/subtitle>/is)
      const linkMatch = xmlText.match(/<link[^>]*href="([^"]*)"[^>]*>/i)
      
      channelTitle = cleanText(titleMatch?.[1] || 'Atom Feed')
      channelDesc = cleanText(subtitleMatch?.[1] || 'Atom Feed')
      channelLink = linkMatch?.[1] || ''
    } else {
      // Parse RSS feed - look for channel info more carefully
      const channelMatch = xmlText.match(/<channel[^>]*>(.*?)<\/channel>/is)
      const channelContent = channelMatch?.[1] || xmlText
      
      const titleMatch = channelContent.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is)
      const descMatch = channelContent.match(/<description[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is)
      const linkMatch = channelContent.match(/<link[^>]*>(.*?)<\/link>/is)
      
      channelTitle = cleanText(titleMatch?.[1] || 'RSS Feed')
      channelDesc = cleanText(descMatch?.[1] || 'RSS Feed')
      channelLink = cleanText(linkMatch?.[1] || '')
    }
    
    console.log('Extracted channel info:', { channelTitle, channelDesc, channelLink })
    
    // Extract items
    const items: RSSItem[] = []
    let itemMatches: RegExpMatchArray | null = null
    
    if (isAtom) {
      itemMatches = xmlText.match(/<entry[^>]*>.*?<\/entry>/gis)
    } else {
      itemMatches = xmlText.match(/<item[^>]*>.*?<\/item>/gis)
    }
    
    console.log('Found item matches:', itemMatches?.length || 0)
    
    if (itemMatches) {
      console.log('First item preview:', itemMatches[0]?.substring(0, 300))
      for (let i = 0; i < Math.min(itemMatches.length, 20); i++) {
        const itemXml = itemMatches[i]
        const item = isAtom ? parseAtomEntry(itemXml) : parseRSSItem(itemXml)
        console.log(`Item ${i + 1} parsed result:`, item ? { title: item.title, link: item.link } : 'null')
        if (item) {
          items.push(item)
        }
      }
    }
    
    console.log('Parsed items count:', items.length)
    
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
    console.log('Parsing RSS item, XML length:', itemXml.length)
    
    const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is)
    const descMatch = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is)
    const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/is)
    const pubDateMatch = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/is)
    const guidMatch = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/is)
    const authorMatch = itemXml.match(/<author[^>]*>(.*?)<\/author>|<dc:creator[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/dc:creator>/is)
    
    const title = cleanText(titleMatch?.[1] || '')
    const description = cleanText(descMatch?.[1] || '')
    const link = cleanText(linkMatch?.[1] || '')
    const pubDate = pubDateMatch?.[1]?.trim() || new Date().toISOString()
    const guid = guidMatch?.[1]?.trim() || link || `item-${Date.now()}-${Math.random()}`
    const author = cleanText(authorMatch?.[1] || authorMatch?.[2] || '')
    
    console.log('RSS item extract results:', {
      titleMatch: !!titleMatch,
      descMatch: !!descMatch,
      linkMatch: !!linkMatch,
      title: title.substring(0, 50),
      description: description.substring(0, 50)
    })
    
    if (!title && !description) {
      console.log('Skipping RSS item - no title or description')
      return null // Skip items without content
    }
    
    return {
      title,
      description,
      link,
      pubDate,
      guid,
      author
    }
    
  } catch (error) {
    console.error('Error parsing RSS item:', error)
    return null
  }
}

function parseAtomEntry(entryXml: string): RSSItem | null {
  try {
    console.log('Parsing Atom entry, XML length:', entryXml.length)
    
    const titleMatch = entryXml.match(/<title[^>]*>(.*?)<\/title>/is)
    const summaryMatch = entryXml.match(/<summary[^>]*>(.*?)<\/summary>/is)
    const contentMatch = entryXml.match(/<content[^>]*>(.*?)<\/content>/is)
    const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*>/i)
    const publishedMatch = entryXml.match(/<published[^>]*>(.*?)<\/published>/is)
    const updatedMatch = entryXml.match(/<updated[^>]*>(.*?)<\/updated>/is)
    const idMatch = entryXml.match(/<id[^>]*>(.*?)<\/id>/is)
    const authorMatch = entryXml.match(/<author[^>]*>.*?<name[^>]*>(.*?)<\/name>.*?<\/author>/is)
    
    const title = cleanText(titleMatch?.[1] || '')
    const description = cleanText(summaryMatch?.[1] || contentMatch?.[1] || '')
    const link = linkMatch?.[1] || ''
    const pubDate = (publishedMatch?.[1] || updatedMatch?.[1] || new Date().toISOString()).trim()
    const guid = idMatch?.[1]?.trim() || link || `entry-${Date.now()}-${Math.random()}`
    const author = cleanText(authorMatch?.[1] || '')
    
    console.log('Atom entry extract results:', {
      titleMatch: !!titleMatch,
      summaryMatch: !!summaryMatch,
      contentMatch: !!contentMatch,
      linkMatch: !!linkMatch,
      title: title.substring(0, 50),
      description: description.substring(0, 50)
    })
    
    if (!title && !description) {
      console.log('Skipping Atom entry - no title or description')
      return null // Skip entries without content
    }
    
    return {
      title,
      description,
      link,
      pubDate,
      guid,
      author
    }
    
  } catch (error) {
    console.error('Error parsing Atom entry:', error)
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