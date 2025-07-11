import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useSupabaseTest = () => {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Simple query to test connection
        const { error } = await supabase
          .from('teams')
          .select('count')
          .limit(1)

        if (error) {
          setError(error.message)
          setConnected(false)
        } else {
          setConnected(true)
          setError(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setConnected(false)
      }
    }

    testConnection()
  }, [])

  return { connected, error }
}