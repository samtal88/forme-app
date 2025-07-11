# ForMe Database Setup

## Supabase Configuration

1. **Create Supabase Project**: Already created at `https://fatyromekhwfdvfudmjm.supabase.co`

2. **Get Anon Key**: 
   - Go to Settings > API in your Supabase dashboard
   - Copy the `anon/public` key
   - Add it to `.env.local` as `VITE_SUPABASE_ANON_KEY`

3. **Run Database Schema**:
   - Go to SQL Editor in Supabase dashboard
   - Copy and paste the contents of `schema.sql`
   - Run the query to create all tables and policies

## Schema Overview

### Core Tables
- **users**: User profiles (extends auth.users)
- **teams**: Football teams and leagues
- **user_preferences**: User settings and favorite team
- **content_sources**: Twitter handles and priorities
- **content_items**: Cached content from sources
- **user_interactions**: Likes, saves, shares
- **api_usage_tracking**: Twitter API rate limiting

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Teams table is publicly readable
- Proper foreign key relationships

### Default Data
- Pre-populated with Premier League, Championship, and Scottish teams
- Default priority sources for testing

## Required Environment Variables

Create `.env.local` with:
```
VITE_SUPABASE_URL=https://fatyromekhwfdvfudmjm.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Authentication Setup

Configure OAuth providers in Supabase:
1. Go to Authentication > Providers
2. Enable Google OAuth
3. Add your Google Client ID and Secret
4. Set redirect URL to your app domain