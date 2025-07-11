export const env = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  twitter: {
    apiKey: import.meta.env.VITE_TWITTER_API_KEY,
    apiSecret: import.meta.env.VITE_TWITTER_API_SECRET,
    accessToken: import.meta.env.VITE_TWITTER_ACCESS_TOKEN,
    accessTokenSecret: import.meta.env.VITE_TWITTER_ACCESS_TOKEN_SECRET,
    bearerToken: import.meta.env.VITE_TWITTER_BEARER_TOKEN,
  },
}

export const validateEnv = () => {
  const missing: string[] = []
  
  if (!env.supabase.url) missing.push('VITE_SUPABASE_URL')
  if (!env.supabase.anonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}