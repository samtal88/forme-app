/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_TWITTER_API_KEY: string
  readonly VITE_TWITTER_API_SECRET: string
  readonly VITE_TWITTER_ACCESS_TOKEN: string
  readonly VITE_TWITTER_ACCESS_TOKEN_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}