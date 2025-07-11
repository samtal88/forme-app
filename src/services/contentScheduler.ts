import { TwitterCurationService, TwitterRateLimitService } from './twitter'
import { getUserSources, createContentItem, getAPIUsage } from './database'

interface ScheduledCurationJob {
  userId: string
  scheduledFor: Date
  priority: 1 | 2 | 3
  executed: boolean
}

class ContentSchedulerService {
  private jobs: ScheduledCurationJob[] = []
  private curationService = new TwitterCurationService()
  private intervalId: NodeJS.Timeout | null = null

  // Smart scheduling based on your specifications:
  // Morning: Priority 1 sources
  // Afternoon: Priority 2 sources rotation  
  // Evening: Priority 3 sources rotation
  private getOptimalSchedule(): { hour: number; priority: 1 | 2 | 3 }[] {
    return [
      { hour: 9, priority: 1 },   // 9 AM - Priority 1 (SkySportsNews, etc.)
      { hour: 14, priority: 2 },  // 2 PM - Priority 2 (FabrizioRomano, LUFC, RangersFC)
      { hour: 19, priority: 3 },  // 7 PM - Priority 3 (ibroxrocks, etc.)
    ]
  }

  scheduleContentCuration(userId: string) {
    const schedule = this.getOptimalSchedule()
    const today = new Date()
    
    schedule.forEach(({ hour, priority }) => {
      const scheduledTime = new Date(today)
      scheduledTime.setHours(hour, 0, 0, 0)
      
      // If the time has passed today, schedule for tomorrow
      if (scheduledTime <= new Date()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1)
      }

      this.jobs.push({
        userId,
        scheduledFor: scheduledTime,
        priority,
        executed: false
      })
    })

    this.startScheduler()
  }

  public startScheduler() {
    if (this.intervalId) return // Already running

    // Check every 5 minutes for jobs to execute
    this.intervalId = setInterval(() => {
      this.executeScheduledJobs()
    }, 5 * 60 * 1000) // 5 minutes
  }

  private async executeScheduledJobs() {
    const now = new Date()
    const jobsToExecute = this.jobs.filter(job => 
      !job.executed && job.scheduledFor <= now
    )

    for (const job of jobsToExecute) {
      try {
        await this.executeCurationJob(job)
        job.executed = true
      } catch (error) {
        console.error(`Failed to execute curation job for user ${job.userId}:`, error)
        // Mark as executed to prevent retry loops, but log the failure
        job.executed = true
      }
    }

    // Clean up executed jobs older than 24 hours
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    this.jobs = this.jobs.filter(job => 
      !job.executed || job.scheduledFor > oneDayAgo
    )
  }

  private async executeCurationJob(job: ScheduledCurationJob) {
    console.log(`Executing curation job for user ${job.userId}, priority ${job.priority}`)

    // Check if user has API calls remaining
    const { canCall, reason } = await TwitterRateLimitService.canMakeAPICall(job.userId)
    if (!canCall) {
      console.log(`Skipping curation for user ${job.userId}: ${reason}`)
      return
    }

    try {
      // Get user's sources for this priority level
      const allSources = await getUserSources(job.userId)
      const prioritySources = allSources.filter(s => 
        s.is_active && s.priority === job.priority
      )

      if (prioritySources.length === 0) {
        console.log(`No priority ${job.priority} sources found for user ${job.userId}`)
        return
      }

      // Execute curation for this priority level
      const contentItems = await this.curationService.curateContentForUser(
        job.userId,
        prioritySources.map(s => ({ id: s.id, handle: s.handle, priority: s.priority }))
      )

      console.log(`Curated ${contentItems.length} items for user ${job.userId}, priority ${job.priority}`)

      // Save content items to database
      for (const item of contentItems) {
        try {
          await createContentItem(item)
        } catch (error: any) {
          // Ignore duplicate content errors
          if (!error.message?.includes('duplicate')) {
            console.error('Error saving content item:', error)
          }
        }
      }

    } catch (error) {
      console.error(`Curation job failed for user ${job.userId}:`, error)
      throw error
    }
  }

  // Manual curation trigger (for user-initiated refresh)
  async manualCuration(userId: string): Promise<number> {
    console.log(`Manual curation triggered for user ${userId}`)

    const { canCall, reason } = await TwitterRateLimitService.canMakeAPICall(userId)
    if (!canCall) {
      throw new Error(reason || 'Rate limit exceeded')
    }

    const sources = await getUserSources(userId)
    const activeSources = sources.filter(s => s.is_active)

    if (activeSources.length === 0) {
      throw new Error('No active content sources found')
    }

    const contentItems = await this.curationService.curateContentForUser(
      userId,
      activeSources.map(s => ({ id: s.id, handle: s.handle, priority: s.priority }))
    )

    // Save to database
    let savedCount = 0
    for (const item of contentItems) {
      try {
        await createContentItem(item)
        savedCount++
      } catch (error: any) {
        // Count non-duplicate errors
        if (!error.message?.includes('duplicate')) {
          console.error('Error saving content item:', error)
        }
      }
    }

    return savedCount
  }

  // Get usage statistics for a user
  async getUserStats(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const usage = await getAPIUsage(userId, 'twitter', today)
      const remaining = await TwitterRateLimitService.getRemainingCalls(userId)
      
      return {
        callsUsedToday: usage?.calls_used || 0,
        callsRemaining: remaining,
        dailyLimit: 3,
        nextScheduledJobs: this.jobs
          .filter(job => job.userId === userId && !job.executed)
          .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
          .slice(0, 3) // Next 3 jobs
      }
    } catch (error) {
      console.error('Error getting user stats:', error)
      return {
        callsUsedToday: 0,
        callsRemaining: 0,
        dailyLimit: 3,
        nextScheduledJobs: []
      }
    }
  }

  stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}

// Export singleton instance
export const contentScheduler = new ContentSchedulerService()

// Auto-start scheduler when module loads
if (typeof window !== 'undefined') {
  // Only start in browser environment
  contentScheduler.startScheduler()
}