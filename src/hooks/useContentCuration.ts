import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { unifiedCuration } from '../services/contentCuration'

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

  const updateRemainingCalls = useCallback(async () => {
    if (!user) return
    
    try {
      const remaining = await unifiedCuration.getRemainingAPICalls(user.id)
      setState(prev => ({ ...prev, remainingCalls: remaining.twitter }))
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
      // Progress callback
      const onProgress = (status: string) => {
        setState(prev => ({ ...prev, progressStatus: status }))
      }

      // Use unified curation service (handles both Twitter and RSS)
      const savedCount = await unifiedCuration.curateAllContent(user.id, { onProgress })

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
  }, [user, updateRemainingCalls])

  const canCurateContent = useCallback(async (): Promise<{ canCurate: boolean; reason?: string }> => {
    if (!user) return { canCurate: false, reason: 'User not authenticated' }
    
    try {
      return await unifiedCuration.canCurateContent(user.id)
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