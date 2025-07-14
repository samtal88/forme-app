export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface Team {
  id: string
  name: string
  league: string
  official_handle?: string
  logo_url?: string
  rivals?: string[]
  created_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  favorite_team_id?: string
  theme: 'light' | 'dark'
  notifications_enabled: boolean
  email_digest: boolean
  created_at: string
  updated_at: string
}

export interface ContentSource {
  id: string
  user_id: string
  platform: 'twitter' | 'rss'
  handle: string
  display_name?: string
  feed_url?: string  // For RSS feeds
  priority: number
  is_active: boolean
  last_updated: string
  created_at: string
}

export interface ContentItem {
  id: string
  source_id: string
  platform_id: string
  content_text?: string
  author_handle: string
  posted_at: string
  cached_at: string
  engagement_count: number
  is_breaking_news: boolean
  content_type: 'breaking' | 'transfer' | 'team' | 'general'
  media_urls?: string[]
  external_url?: string
  source_url?: string      // Original RSS article URL
  content_summary?: string // RSS description/summary
}

export interface UserInteraction {
  id: string
  user_id: string
  content_id: string
  interaction_type: 'like' | 'share' | 'save' | 'hide'
  created_at: string
}

export interface ApiUsageTracking {
  id: string
  user_id: string
  platform: 'twitter' | 'rss'
  calls_used: number
  date: string
  created_at: string
}

// Database response types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id'>>
      }
      teams: {
        Row: Team
        Insert: Omit<Team, 'id' | 'created_at'>
        Update: Partial<Omit<Team, 'id' | 'created_at'>>
      }
      user_preferences: {
        Row: UserPreferences
        Insert: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserPreferences, 'id'>>
      }
      content_sources: {
        Row: ContentSource
        Insert: Omit<ContentSource, 'id' | 'created_at' | 'last_updated'>
        Update: Partial<Omit<ContentSource, 'id' | 'created_at'>>
      }
      content_items: {
        Row: ContentItem
        Insert: Omit<ContentItem, 'id' | 'cached_at'>
        Update: Partial<Omit<ContentItem, 'id'>>
      }
      user_interactions: {
        Row: UserInteraction
        Insert: Omit<UserInteraction, 'id' | 'created_at'>
        Update: Partial<Omit<UserInteraction, 'id' | 'created_at'>>
      }
      api_usage_tracking: {
        Row: ApiUsageTracking
        Insert: Omit<ApiUsageTracking, 'id' | 'created_at'>
        Update: Partial<Omit<ApiUsageTracking, 'id' | 'created_at'>>
      }
    }
  }
}