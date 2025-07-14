import { TwitterCurationService, TwitterRateLimitService } from './twitter'
import { RSSCurationService } from './rss'
import { getUserSources, createContentItem } from './database'
import type { RSSSource, TwitterSource, ContentItem } from '../types'

interface CurationProgress {
  onProgress?: (status: string) => void
}

export class UnifiedContentCurationService {
  private twitterCuration: TwitterCurationService
  private rssCuration: RSSCurationService
  
  constructor() {
    this.twitterCuration = new TwitterCurationService()
    this.rssCuration = new RSSCurationService()
  }
  
  async curateAllContent(
    userId: string,
    options: CurationProgress = {}
  ): Promise<number> {
    const { onProgress } = options
    
    try {
      onProgress?.('Loading user sources...')
      
      // Get all user sources
      const allSources = await getUserSources(userId)
      const activeSources = allSources.filter(s => s.is_active)
      
      if (activeSources.length === 0) {
        throw new Error('No active content sources found. Please add some sources first.')
      }
      
      // Separate Twitter and RSS sources
      const twitterSources = activeSources.filter(s => s.platform === 'twitter') as TwitterSource[]
      const rssSources = activeSources.filter(s => s.platform === 'rss') as RSSSource[]
      
      onProgress?.(`Found ${twitterSources.length} Twitter and ${rssSources.length} RSS sources`)
      
      const allContentItems: Array<Omit<ContentItem, 'id' | 'cached_at'>> = []
      
      // Curate RSS content first (no rate limits)
      if (rssSources.length > 0) {
        onProgress?.('Starting RSS content curation...')
        
        const rssItems = await this.rssCuration.curateRSSContent(
          userId,
          rssSources,
          onProgress
        )
        
        allContentItems.push(...rssItems)
        onProgress?.(`RSS curation complete: ${rssItems.length} items`)
      }
      
      // Curate Twitter content (with rate limiting)
      if (twitterSources.length > 0) {
        onProgress?.('Checking Twitter rate limits...')
        
        const { canCall, reason } = await TwitterRateLimitService.canMakeAPICall(userId)
        
        if (canCall) {
          onProgress?.('Starting Twitter content curation...')
          
          const twitterItems = await this.twitterCuration.curateContentForUser(
            userId,
            twitterSources.map(s => ({ id: s.id, handle: s.handle, priority: s.priority })),
            onProgress
          )
          
          allContentItems.push(...twitterItems)
          onProgress?.(`Twitter curation complete: ${twitterItems.length} items`)
        } else {
          onProgress?.(`Twitter rate limited: ${reason}`)
        }
      }
      
      // Save all content to database
      onProgress?.(`Saving ${allContentItems.length} items to database...`)
      
      let savedCount = 0
      for (const item of allContentItems) {
        try {
          await createContentItem(item)
          savedCount++
        } catch (error) {
          // Log but don't fail for duplicates
          console.warn('Failed to save content item (likely duplicate):', error)
        }
      }
      
      onProgress?.(`✅ Content curation completed! Saved ${savedCount} new items`)
      return savedCount
      
    } catch (error: any) {
      onProgress?.(`❌ Curation failed: ${error.message}`)
      throw error
    }
  }
  
  async canCurateContent(userId: string): Promise<{ canCurate: boolean; reason?: string }> {
    try {
      const sources = await getUserSources(userId)
      const activeSources = sources.filter(s => s.is_active)
      
      if (activeSources.length === 0) {
        return { canCurate: false, reason: 'No active content sources' }
      }
      
      const hasRSS = activeSources.some(s => s.platform === 'rss')
      const hasTwitter = activeSources.some(s => s.platform === 'twitter')
      
      if (hasRSS) {
        // RSS is always available
        return { canCurate: true }
      }
      
      if (hasTwitter) {
        // Check Twitter rate limits
        const twitterCheck = await TwitterRateLimitService.canMakeAPICall(userId)
        return { canCurate: twitterCheck.canCall, reason: twitterCheck.reason }
      }
      
      return { canCurate: false, reason: 'No supported sources found' }
      
    } catch (error) {
      return { canCurate: false, reason: 'Error checking curation status' }
    }
  }
  
  async getRemainingAPICalls(userId: string): Promise<{ twitter: number; rss: string }> {
    try {
      const twitterCalls = await TwitterRateLimitService.getRemainingCalls(userId)
      return {
        twitter: twitterCalls,
        rss: 'Unlimited' // RSS feeds have no limits
      }
    } catch (error) {
      return { twitter: 0, rss: 'Unknown' }
    }
  }
}

export const unifiedCuration = new UnifiedContentCurationService()