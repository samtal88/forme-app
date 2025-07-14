export * from './database'
import type { ContentItem, ContentSource, UserInteraction } from './database'

// RSS-specific types
export interface RSSFeed {
  title: string
  description: string
  link: string
  items: RSSItem[]
}

export interface RSSItem {
  title: string
  description: string
  link: string
  pubDate: string
  guid: string
  author?: string
}

// Helper types for content sources
export type TwitterSource = ContentSource & {
  platform: 'twitter'
  feed_url: undefined
}

export type RSSSource = ContentSource & {
  platform: 'rss'
  feed_url: string
}

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

export interface OnboardingData {
  selectedTeam?: string
  selectedSources?: string[]
  preferences?: {
    notifications: boolean
    emailDigest: boolean
  }
}

export interface FeedItem extends ContentItem {
  source: ContentSource
  userInteractions: UserInteraction[]
  isLiked: boolean
  isSaved: boolean
}

export interface TwitterAPIConfig {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

export interface APIUsageStatus {
  platform: 'twitter' | 'instagram' | 'youtube'
  callsUsed: number
  callsLimit: number
  resetDate: string
}

export interface SourcePriority {
  id: string
  handle: string
  priority: number
  isActive: boolean
}