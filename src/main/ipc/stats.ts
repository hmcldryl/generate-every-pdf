import { getDb } from '../db'
import type { DashboardStats } from '@shared/types'
import { listGenerationJobs } from './history'

export function getDashboardStats(): DashboardStats {
  const db = getDb()
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS totalJobs,
         COALESCE(SUM(total), 0) AS totalGenerated,
         COALESCE(SUM(succeeded), 0) AS totalSucceeded,
         COALESCE(SUM(failed), 0) AS totalFailed
       FROM generation_jobs`
    )
    .get() as { totalJobs: number; totalGenerated: number; totalSucceeded: number; totalFailed: number }

  return {
    ...totals,
    recentJobs: listGenerationJobs(5)
  }
}
