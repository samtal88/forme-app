import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { TwitterCurationService, TwitterRateLimitService } from '../services/twitter'
import { getUserSources, createContentItem } from '../services/database'

interface CurationState {
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  remainingCalls: number
  progressStatus: string | null
}

export const useContentCuration = () => {
  const [state, setState] = useState<CurationState>({
    loading: false,
    error: null,
    lastUpdated: null,
    remainingCalls: 0,
    progressStatus: null
  })
  
  const { user } = useAuth()
  const curationService = new TwitterCurationService()

  const updateRemainingCalls = useCallback(async () => {
    if (!user) return
    
    try {
      const remaining = await TwitterRateLimitService.getRemainingCalls(user.id)
      setState(prev => ({ ...prev, remainingCalls: remaining }))
    } catch (error) {
      console.error('Error updating remaining calls:', error)
    }
  }, [user])

  const curateContent = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null, progressStatus: 'Initializing...' }))

    try {
      // Get user's content sources
      const sources = await getUserSources(user.id)
      const activeSources = sources.filter(s => s.is_active)

      if (activeSources.length === 0) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          progressStatus: null,
          error: 'No active content sources found. Please add some sources first.' 
        }))
        return
      }

      // Check rate limits
      const { canCall, reason } = await TwitterRateLimitService.canMakeAPICall(user.id)
      if (!canCall) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          progressStatus: null,
          error: reason || 'Rate limit exceeded' 
        }))
        return
      }

      // Progress callback
      const onProgress = (status: string) => {
        setState(prev => ({ ...prev, progressStatus: status }))
      }

      // Curate content from sources with progress updates
      const contentItems = await curationService.curateContentForUser(
        user.id,
        activeSources.map(s => ({ id: s.id, handle: s.handle, priority: s.priority })),
        onProgress
      )

      setState(prev => ({ ...prev, progressStatus: 'Saving content to database...' }))

      // Save content to database
      let savedCount = 0
      for (const item of contentItems) {
        try {
          await createContentItem(item)
          savedCount++
        } catch (error) {
          // Log but don't fail the entire operation for duplicate content
          console.warn('Failed to save content item:', error)
        }
      }

      // Update state
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        progressStatus: null,
        lastUpdated: new Date(),
        error: null
      }))

      // Update remaining calls
      await updateRemainingCalls()

      return savedCount
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        progressStatus: null,
        error: error.message || 'Failed to curate content' 
      }))
      throw error
    }
  }, [user, curationService, updateRemainingCalls])

  const canCurateContent = useCallback(async (): Promise<{ canCurate: boolean; reason?: string }> => {
    if (!user) return { canCurate: false, reason: 'User not authenticated' }
    
    try {
      const sources = await getUserSources(user.id)
      const activeSources = sources.filter(s => s.is_active)
      
      if (activeSources.length === 0) {
        return { canCurate: false, reason: 'No active content sources' }
      }

      const result = await TwitterRateLimitService.canMakeAPICall(user.id)
      return { canCurate: result.canCall, reason: result.reason }
    } catch (error) {
      return { canCurate: false, reason: 'Error checking curation status' }
    }
  }, [user])

  return {
    ...state,
    curateContent,
    canCurateContent,
    updateRemainingCalls
  }
}