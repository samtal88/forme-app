import { env } from '../utils/env'
import { incrementAPIUsage, getAPIUsage } from './database'
import type { ContentItem } from '../types'

interface TwitterTweet {
  id: string
  text: string
  author_id: string
  created_at: string
  public_metrics: {
    retweet_count: number
    like_count: number
    reply_count: number
    quote_count: number
  }
  attachments?: {
    media_keys: string[]
  }
}

interface TwitterUser {
  id: string
  username: string
  name: string
  profile_image_url: string
}

interface TwitterAPIResponse {
  data: TwitterTweet[]
  includes?: {
    users: TwitterUser[]
    media?: any[]
  }
  meta: {
    result_count: number
    next_token?: string
  }
}

class TwitterAPIService {
  private baseURL = 'https://api.twitter.com/2'
  private headers: HeadersInit

  constructor() {
    this.headers = {
      'Authorization': `Bearer ${env.twitter.accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Twitter API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  async getUserTweets(username: string, maxResults: number = 10): Promise<TwitterTweet[]> {
    try {
      // First get user ID by username
      const userResponse = await this.makeRequest(`/users/by/username/${username}`, {
        'user.fields': 'id,username,name,profile_image_url'
      })

      if (!userResponse.data) {
        throw new Error(`User ${username} not found`)
      }

      const userId = userResponse.data.id

      // Get user's tweets
      const tweetsResponse: TwitterAPIResponse = await this.makeRequest(`/users/${userId}/tweets`, {
        'max_results': maxResults.toString(),
        'tweet.fields': 'created_at,public_metrics,attachments,context_annotations',
        'expansions': 'author_id,attachments.media_keys',
        'user.fields': 'username,name,profile_image_url',
        'media.fields': 'type,url,preview_image_url'
      })

      return tweetsResponse.data || []
    } catch (error) {
      console.error(`Error fetching tweets for ${username}:`, error)
      throw error
    }
  }

  async searchTweets(query: string, maxResults: number = 10): Promise<TwitterTweet[]> {
    try {
      const response: TwitterAPIResponse = await this.makeRequest('/tweets/search/recent', {
        'query': query,
        'max_results': maxResults.toString(),
        'tweet.fields': 'created_at,public_metrics,attachments,context_annotations',
        'expansions': 'author_id,attachments.media_keys',
        'user.fields': 'username,name,profile_image_url',
        'media.fields': 'type,url,preview_image_url'
      })

      return response.data || []
    } catch (error) {
      console.error(`Error searching tweets for "${query}":`, error)
      throw error
    }
  }

  transformTweetToContentItem(tweet: TwitterTweet, sourceId: string, authorHandle: string): Omit<ContentItem, 'id' | 'cached_at'> {
    const totalEngagement = tweet.public_metrics.like_count + 
                           tweet.public_metrics.retweet_count + 
                           tweet.public_metrics.reply_count + 
                           tweet.public_metrics.quote_count

    // Detect content type based on keywords and engagement
    let contentType: 'breaking' | 'transfer' | 'team' | 'general' = 'general'
    const text = tweet.text.toLowerCase()

    if (text.includes('breaking') || text.includes('🚨') || totalEngagement > 1000) {
      contentType = 'breaking'
    } else if (text.includes('transfer') || text.includes('signs') || text.includes('deal')) {
      contentType = 'transfer'
    } else if (text.includes('team') || text.includes('squad') || text.includes('lineup')) {
      contentType = 'team'
    }

    return {
      source_id: sourceId,
      platform_id: tweet.id,
      content_text: tweet.text,
      author_handle: authorHandle,
      posted_at: tweet.created_at,
      engagement_count: totalEngagement,
      is_breaking_news: contentType === 'breaking',
      content_type: contentType,
      media_urls: tweet.attachments?.media_keys || [],
      external_url: `https://twitter.com/${authorHandle}/status/${tweet.id}`
    }
  }
}

// Rate limiting service
export class TwitterRateLimitService {
  private static readonly DAILY_LIMIT = 3 // Free tier: ~100 calls/month ÷ 30 days

  static async canMakeAPICall(userId: string): Promise<{ canCall: boolean; reason?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const usage = await getAPIUsage(userId, 'twitter', today)
      
      const dailyCalls = usage?.calls_used || 0
      
      if (dailyCalls >= this.DAILY_LIMIT) {
        return { 
          canCall: false, 
          reason: `Daily limit reached (${dailyCalls}/${this.DAILY_LIMIT} calls used)` 
        }
      }

      return { canCall: true }
    } catch (error) {
      console.error('Error checking rate limit:', error)
      return { canCall: false, reason: 'Error checking rate limit' }
    }
  }

  static async recordAPICall(userId: string): Promise<void> {
    try {
      await incrementAPIUsage(userId, 'twitter')
    } catch (error) {
      console.error('Error recording API call:', error)
    }
  }

  static async getRemainingCalls(userId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const usage = await getAPIUsage(userId, 'twitter', today)
      const used = usage?.calls_used || 0
      return Math.max(0, this.DAILY_LIMIT - used)
    } catch (error) {
      console.error('Error getting remaining calls:', error)
      return 0
    }
  }
}

// Smart content curation service
export class TwitterCurationService {
  private twitterAPI: TwitterAPIService
  
  constructor() {
    this.twitterAPI = new TwitterAPIService()
  }

  async curateContentForUser(userId: string, sources: Array<{ id: string; handle: string; priority: number }>) {
    const { canCall, reason } = await TwitterRateLimitService.canMakeAPICall(userId)
    
    if (!canCall) {
      throw new Error(reason || 'Rate limit exceeded')
    }

    // Smart prioritization: Focus on Priority 1 sources first
    const prioritySources = sources.sort((a, b) => a.priority - b.priority)
    const remainingCalls = await TwitterRateLimitService.getRemainingCalls(userId)
    
    // Distribute calls based on priority
    const sourcesToFetch = this.distributeCalls(prioritySources, remainingCalls)
    
    const contentItems: Array<Omit<ContentItem, 'id' | 'cached_at'>> = []

    for (const { source, callsToUse } of sourcesToFetch) {
      try {
        console.log(`Fetching ${callsToUse} tweets from @${source.handle}`)
        
        const tweets = await this.twitterAPI.getUserTweets(source.handle, callsToUse)
        await TwitterRateLimitService.recordAPICall(userId)

        for (const tweet of tweets) {
          const contentItem = this.twitterAPI.transformTweetToContentItem(
            tweet, 
            source.id, 
            source.handle
          )
          contentItems.push(contentItem)
        }
      } catch (error) {
        console.error(`Failed to fetch content from @${source.handle}:`, error)
        // Continue with other sources even if one fails
      }
    }

    return contentItems
  }

  private distributeCalls(
    sources: Array<{ id: string; handle: string; priority: number }>, 
    totalCalls: number
  ): Array<{ source: typeof sources[0]; callsToUse: number }> {
    if (totalCalls === 0) return []

    const result: Array<{ source: typeof sources[0]; callsToUse: number }> = []
    
    // Priority 1 gets most calls, Priority 2 gets medium, Priority 3 gets least
    const priority1Sources = sources.filter(s => s.priority === 1)
    const priority2Sources = sources.filter(s => s.priority === 2)
    const priority3Sources = sources.filter(s => s.priority === 3)

    let remainingCalls = totalCalls

    // Priority 1: 50% of calls
    if (priority1Sources.length > 0 && remainingCalls > 0) {
      const callsForP1 = Math.max(1, Math.floor(totalCalls * 0.5))
      const callsPerSource = Math.max(1, Math.floor(callsForP1 / priority1Sources.length))
      
      priority1Sources.forEach(source => {
        const calls = Math.min(callsPerSource, remainingCalls)
        if (calls > 0) {
          result.push({ source, callsToUse: calls })
          remainingCalls -= calls
        }
      })
    }

    // Priority 2: 35% of remaining calls
    if (priority2Sources.length > 0 && remainingCalls > 0) {
      const callsForP2 = Math.max(1, Math.floor(totalCalls * 0.35))
      const callsPerSource = Math.max(1, Math.floor(callsForP2 / priority2Sources.length))
      
      priority2Sources.forEach(source => {
        const calls = Math.min(callsPerSource, remainingCalls)
        if (calls > 0) {
          result.push({ source, callsToUse: calls })
          remainingCalls -= calls
        }
      })
    }

    // Priority 3: Remaining calls
    if (priority3Sources.length > 0 && remainingCalls > 0) {
      const callsPerSource = Math.max(1, Math.floor(remainingCalls / priority3Sources.length))
      
      priority3Sources.forEach(source => {
        const calls = Math.min(callsPerSource, remainingCalls)
        if (calls > 0) {
          result.push({ source, callsToUse: calls })
          remainingCalls -= calls
        }
      })
    }

    return result
  }
}

export const twitterAPI = new TwitterAPIService()
export const twitterCuration = new TwitterCurationService()