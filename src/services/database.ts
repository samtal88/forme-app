import { supabase } from './supabase'
import type {
  Team,
  UserPreferences,
  ContentSource,
  ContentItem,
  UserInteraction,
  ApiUsageTracking,
} from '../types'

// Teams
export const getTeams = async () => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('league', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data as Team[]
}

export const getTeamsByLeague = async (league: string) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('league', league)
    .order('name', { ascending: true })

  if (error) throw error
  return data as Team[]
}

// User Preferences
export const getUserPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*, teams(*)')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as UserPreferences | null
}

export const createUserPreferences = async (preferences: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .insert(preferences)
    .select()
    .single()

  if (error) throw error
  return data as UserPreferences
}

export const updateUserPreferences = async (userId: string, updates: Partial<UserPreferences>) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as UserPreferences
}

// Content Sources
export const getUserSources = async (userId: string) => {
  const { data, error } = await supabase
    .from('content_sources')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: true })

  if (error) throw error
  return data as ContentSource[]
}

export const createContentSource = async (source: Omit<ContentSource, 'id' | 'created_at' | 'last_updated'>) => {
  const { data, error } = await supabase
    .from('content_sources')
    .insert(source)
    .select()
    .single()

  if (error) throw error
  return data as ContentSource
}

export const updateContentSource = async (id: string, updates: Partial<ContentSource>) => {
  const { data, error } = await supabase
    .from('content_sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ContentSource
}

export const deleteContentSource = async (id: string) => {
  const { error } = await supabase
    .from('content_sources')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const updateSourcePriorities = async (sources: { id: string; priority: number }[]) => {
  const updates = sources.map(source => 
    supabase
      .from('content_sources')
      .update({ priority: source.priority })
      .eq('id', source.id)
  )

  const results = await Promise.all(updates)
  const errors = results.filter(result => result.error)
  
  if (errors.length > 0) {
    throw errors[0].error
  }
}

// Content Items
export const getUserContent = async (userId: string, limit: number = 20, offset: number = 0) => {
  const { data, error } = await supabase
    .from('content_items')
    .select(`
      *,
      content_sources!inner(
        id,
        handle,
        display_name,
        user_id
      ),
      user_interactions(
        interaction_type
      )
    `)
    .eq('content_sources.user_id', userId)
    .order('posted_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data as (ContentItem & { 
    content_sources: ContentSource,
    user_interactions: UserInteraction[]
  })[]
}

export const createContentItem = async (item: Omit<ContentItem, 'id' | 'cached_at'>) => {
  const { data, error } = await supabase
    .from('content_items')
    .upsert(item, {
      onConflict: 'source_id,platform_id',
      ignoreDuplicates: false
    })
    .select()
    .single()

  if (error) throw error
  return data as ContentItem
}

export const getContentBySource = async (sourceId: string, limit: number = 50) => {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('source_id', sourceId)
    .order('posted_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as ContentItem[]
}

// User Interactions
export const createUserInteraction = async (interaction: Omit<UserInteraction, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('user_interactions')
    .upsert(interaction)
    .select()
    .single()

  if (error) throw error
  return data as UserInteraction
}

export const deleteUserInteraction = async (userId: string, contentId: string, type: string) => {
  const { error } = await supabase
    .from('user_interactions')
    .delete()
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('interaction_type', type)

  if (error) throw error
}

export const getUserInteractions = async (userId: string, contentIds: string[]) => {
  const { data, error } = await supabase
    .from('user_interactions')
    .select('*')
    .eq('user_id', userId)
    .in('content_id', contentIds)

  if (error) throw error
  return data as UserInteraction[]
}

// API Usage Tracking
export const getAPIUsage = async (userId: string, platform: string, date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('api_usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('date', targetDate)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as ApiUsageTracking | null
}

export const updateAPIUsage = async (userId: string, platform: string, callsUsed: number, date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('api_usage_tracking')
    .upsert({
      user_id: userId,
      platform,
      calls_used: callsUsed,
      date: targetDate,
    })
    .select()
    .single()

  if (error) throw error
  return data as ApiUsageTracking
}

export const incrementAPIUsage = async (userId: string, platform: string) => {
  const today = new Date().toISOString().split('T')[0]
  const current = await getAPIUsage(userId, platform, today)
  
  const newCount = (current?.calls_used || 0) + 1
  return updateAPIUsage(userId, platform, newCount, today)
}