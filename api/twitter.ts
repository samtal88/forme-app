import type { VercelRequest, VercelResponse } from '@vercel/node'

interface TwitterTweet {
  id: string
  text: string
  author_id: string
  created_at: string
  public_metrics: {
    retweet_count: number
    like_count: number
    reply_count: number
    quote_count: number
  }
}

interface TwitterAPIResponse {
  data: TwitterTweet[]
  includes?: {
    users: Array<{
      id: string
      username: string
      name: string
    }>
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, maxResults = '10' } = req.query

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username parameter required' })
  }

  const bearerToken = process.env.VITE_TWITTER_BEARER_TOKEN

  if (!bearerToken) {
    return res.status(500).json({ error: 'Twitter Bearer Token not configured' })
  }

  try {
    // First get user ID by username
    const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      }
    })

    if (!userResponse.ok) {
      const error = await userResponse.text()
      return res.status(userResponse.status).json({ 
        error: `Twitter API Error: ${userResponse.status} - ${error}` 
      })
    }

    const userData = await userResponse.json()

    if (!userData.data) {
      return res.status(404).json({ error: `User ${username} not found` })
    }

    const userId = userData.data.id

    // Get user's tweets
    const tweetsResponse = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics&expansions=author_id&user.fields=username,name`, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      }
    })

    if (!tweetsResponse.ok) {
      const error = await tweetsResponse.text()
      return res.status(tweetsResponse.status).json({ 
        error: `Twitter API Error: ${tweetsResponse.status} - ${error}` 
      })
    }

    const tweetsData: TwitterAPIResponse = await tweetsResponse.json()

    return res.status(200).json({
      success: true,
      data: tweetsData.data || [],
      includes: tweetsData.includes,
      count: tweetsData.data?.length || 0
    })

  } catch (error: any) {
    console.error('Twitter API Error:', error)
    return res.status(500).json({ 
      error: `Server error: ${error.message}` 
    })
  }
}