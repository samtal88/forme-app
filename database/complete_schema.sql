-- Drop existing objects to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_email_confirmed();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can manage own sources" ON public.content_sources;
DROP POLICY IF EXISTS "Users can view content from their sources" ON public.content_items;
DROP POLICY IF EXISTS "Users can manage own interactions" ON public.user_interactions;
DROP POLICY IF EXISTS "Users can view own API usage" ON public.api_usage_tracking;
DROP POLICY IF EXISTS "Teams are publicly readable" ON public.teams;

-- Drop existing triggers
DROP TRIGGER IF EXISTS set_updated_at ON public.users;
DROP TRIGGER IF EXISTS set_updated_at ON public.user_preferences;

-- Drop existing tables (in order to avoid dependency issues)
DROP TABLE IF EXISTS public.user_interactions CASCADE;
DROP TABLE IF EXISTS public.content_items CASCADE;
DROP TABLE IF EXISTS public.content_sources CASCADE;
DROP TABLE IF EXISTS public.api_usage_tracking CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Teams table
CREATE TABLE public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  league TEXT NOT NULL,
  official_handle TEXT,
  logo_url TEXT,
  rivals TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  favorite_team_id UUID REFERENCES public.teams(id),
  theme TEXT DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  email_digest BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content sources table
CREATE TABLE public.content_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'twitter',
  handle TEXT NOT NULL,
  display_name TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content items table
CREATE TABLE public.content_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.content_sources(id) ON DELETE CASCADE,
  platform_id TEXT NOT NULL,
  content_text TEXT,
  author_handle TEXT NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  engagement_count INTEGER DEFAULT 0,
  is_breaking_news BOOLEAN DEFAULT false,
  content_type TEXT DEFAULT 'general',
  media_urls TEXT[],
  external_url TEXT
);

-- User interactions table
CREATE TABLE public.user_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content_items(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_id, interaction_type)
);

-- API usage tracking table
CREATE TABLE public.api_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'twitter',
  calls_used INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, date)
);

-- Create indexes for better performance
CREATE INDEX idx_content_items_posted_at ON public.content_items(posted_at DESC);
CREATE INDEX idx_content_items_source_id ON public.content_items(source_id);
CREATE INDEX idx_content_items_content_type ON public.content_items(content_type);
CREATE INDEX idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX idx_content_sources_user_id ON public.content_sources(user_id);
CREATE INDEX idx_content_sources_priority ON public.content_sources(priority);

-- Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- User preferences policies
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Content sources policies
CREATE POLICY "Users can manage own sources" ON public.content_sources FOR ALL USING (auth.uid() = user_id);

-- Content items policies (users can see content from their sources)
CREATE POLICY "Users can view content from their sources" ON public.content_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.content_sources cs 
  WHERE cs.id = content_items.source_id AND cs.user_id = auth.uid()
));

-- User interactions policies
CREATE POLICY "Users can manage own interactions" ON public.user_interactions FOR ALL USING (auth.uid() = user_id);

-- API usage tracking policies
CREATE POLICY "Users can view own API usage" ON public.api_usage_tracking FOR ALL USING (auth.uid() = user_id);

-- Teams table is public for reading
CREATE POLICY "Teams are publicly readable" ON public.teams FOR SELECT TO authenticated USING (true);

-- Add unique constraint for teams
ALTER TABLE public.teams ADD CONSTRAINT teams_name_league_unique UNIQUE (name, league);

-- Insert default teams data
INSERT INTO public.teams (name, league, official_handle, logo_url) VALUES
('Arsenal', 'Premier League', 'Arsenal', 'https://logos.api/teams/arsenal.png'),
('Chelsea', 'Premier League', 'ChelseaFC', 'https://logos.api/teams/chelsea.png'),
('Liverpool', 'Premier League', 'LFC', 'https://logos.api/teams/liverpool.png'),
('Manchester City', 'Premier League', 'ManCity', 'https://logos.api/teams/man-city.png'),
('Manchester United', 'Premier League', 'ManUtd', 'https://logos.api/teams/man-utd.png'),
('Tottenham', 'Premier League', 'SpursOfficial', 'https://logos.api/teams/tottenham.png'),
('Celtic', 'Scottish Premiership', 'CelticFC', 'https://logos.api/teams/celtic.png'),
('Rangers', 'Scottish Premiership', 'RangersFC', 'https://logos.api/teams/rangers.png'),
('Leeds United', 'Championship', 'LUFC', 'https://logos.api/teams/leeds.png'),
('Leicester City', 'Championship', 'LCFC', 'https://logos.api/teams/leicester.png')
ON CONFLICT (name, league) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create a trigger function to automatically create user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle email confirmation updates for existing users
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.users (id, email, name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.users.name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email confirmation
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();