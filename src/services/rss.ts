import type { RSSFeed, RSSItem, ContentItem, RSSSource } from '../types'

interface RSSAPIResponse {
  success: boolean
  feed: RSSFeed
  itemCount: number
  error?: string
}

export class RSSService {
  
  async fetchRSSFeed(feedUrl: string): Promise<RSSFeed> {
    try {
      console.log(`Fetching RSS feed: ${feedUrl}`)
      
      // Use our Vercel API proxy for RSS parsing
      const url = new URL('/api/rss', window.location.origin)
      url.searchParams.append('feedUrl', feedUrl)
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`RSS API Error: ${response.status} - ${errorText}`)
      }
      
      const data: RSSAPIResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'RSS fetch failed')
      }
      
      console.log(`Successfully fetched ${data.itemCount} items from RSS feed`)
      return data.feed
      
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedUrl}:`, error)
      throw error
    }
  }
  
  transformRSSItemToContentItem(
    rssItem: RSSItem, 
    source: RSSSource
  ): Omit<ContentItem, 'id' | 'cached_at'> {
    
    // Determine content type based on keywords
    const text = (rssItem.title + ' ' + rssItem.description).toLowerCase()
    let contentType: 'breaking' | 'transfer' | 'team' | 'general' = 'general'
    
    if (text.includes('breaking') || text.includes('urgent') || text.includes('confirmed')) {
      contentType = 'breaking'
    } else if (text.includes('transfer') || text.includes('signs') || text.includes('deal') || text.includes('joins')) {
      contentType = 'transfer'
    } else if (text.includes('team') || text.includes('squad') || text.includes('lineup') || text.includes('training')) {
      contentType = 'team'
    }
    
    // Generate engagement count based on content type and source
    let baseEngagement = 50
    if (contentType === 'breaking') baseEngagement = 200
    if (contentType === 'transfer') baseEngagement = 150
    if (source.feed_url?.includes('bbc')) baseEngagement *= 1.5
    if (source.feed_url?.includes('espn')) baseEngagement *= 1.3
    
    const engagement = Math.floor(baseEngagement + Math.random() * 100)
    
    return {
      source_id: source.id,
      platform_id: rssItem.guid,
      content_text: rssItem.title,
      content_summary: rssItem.description,
      author_handle: source.handle,
      posted_at: this.parseRSSDate(rssItem.pubDate),
      engagement_count: engagement,
      is_breaking_news: contentType === 'breaking',
      content_type: contentType,
      external_url: rssItem.link,
      source_url: rssItem.link,
      media_urls: []
    }
  }
  
  private parseRSSDate(pubDate: string): string {
    try {
      // Try to parse various RSS date formats
      const date = new Date(pubDate)
      if (isNaN(date.getTime())) {
        // Fallback to current time if parsing fails
        return new Date().toISOString()
      }
      return date.toISOString()
    } catch (error) {
      console.warn('Failed to parse RSS date:', pubDate)
      return new Date().toISOString()
    }
  }
}

// Rate limiting for RSS feeds (much more lenient than Twitter)
export class RSSRateLimitService {
  static async canMakeRSSCall(): Promise<{ canCall: boolean; reason?: string }> {
    // RSS feeds have no rate limits, but we track usage for analytics
    return { canCall: true }
  }
  
  static async recordRSSCall(): Promise<void> {
    // Could implement analytics tracking here if needed
    console.log('RSS call recorded')
  }
}

// RSS curation service - similar to Twitter curation
export class RSSCurationService {
  private rssService: RSSService
  
  constructor() {
    this.rssService = new RSSService()
  }
  
  async curateRSSContent(
    userId: string,
    sources: RSSSource[],
    onProgress?: (status: string) => void
  ): Promise<Array<Omit<ContentItem, 'id' | 'cached_at'>>> {
    
    const contentItems: Array<Omit<ContentItem, 'id' | 'cached_at'>> = []
    
    onProgress?.(`Starting RSS curation from ${sources.length} feeds...`)
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]
      
      try {
        onProgress?.(`Fetching from ${source.display_name || source.handle} (${i + 1}/${sources.length})...`)
        
        const feed = await this.rssService.fetchRSSFeed(source.feed_url!)
        await RSSRateLimitService.recordRSSCall()
        
        // Transform RSS items to content items (limit to 10 per feed)
        for (const rssItem of feed.items.slice(0, 10)) {
          const contentItem = this.rssService.transformRSSItemToContentItem(rssItem, source)
          contentItems.push(contentItem)
        }
        
        onProgress?.(`✅ Successfully fetched ${feed.items.length} items from ${source.display_name || source.handle}`)
        
        // Small delay between feeds to be respectful
        if (i < sources.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
      } catch (error: any) {
        console.error(`Failed to fetch RSS from ${source.handle}:`, error)
        onProgress?.(`❌ Failed to fetch from ${source.display_name || source.handle}: ${error.message}`)
      }
    }
    
    onProgress?.(`🎉 RSS curation completed! Fetched ${contentItems.length} total items`)
    return contentItems
  }
}

export const rssService = new RSSService()
export const rssCuration = new RSSCurationService()