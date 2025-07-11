export * from './database'
import type { ContentItem, ContentSource, UserInteraction } from './database'

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