import { useEffect, useState } from 'react'
import type { DashboardStats } from '@shared/types'

interface Props {
  onStartWizard: () => void
  onNavigate: (page: 'history' | 'templates' | 'presets') => void
}

export default function DashboardView({ onStartWizard, onNavigate }: Props): JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    window.api.getDashboardStats().then(setStats)
  }, [])

  const successRate =
    stats && stats.totalGenerated > 0 ? Math.round((stats.totalSucceeded / stats.totalGenerated) * 100) : null

  return (
    <div className="view dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Batch-generate PDFs from spreadsheet data using any HTML template you define.</p>
        </div>
      </div>

      <div className="quick-actions">
        <button className="cta" onClick={onStartWizard}>
          + New batch
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <span className="stat-value">{stats?.totalJobs ?? '—'}</span>
          <span className="stat-label">Batches run</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{stats?.totalGenerated ?? '—'}</span>
          <span className="stat-label">PDFs generated</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{stats?.totalFailed ?? '—'}</span>
          <span className="stat-label">Rows failed</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{successRate !== null ? `${successRate}%` : '—'}</span>
          <span className="stat-label">Success rate</span>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent batches</h2>
          <button className="link" onClick={() => onNavigate('history')}>
            View all →
          </button>
        </div>

        {stats && stats.recentJobs.length === 0 && <p className="muted">No batches run yet.</p>}

        {stats && stats.recentJobs.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Started</th>
                <th>Template</th>
                <th>Rows</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentJobs.map((j) => (
                <tr key={j.id}>
                  <td>{new Date(j.startedAt).toLocaleString()}</td>
                  <td>{j.templateId}</td>
                  <td>{j.total}</td>
                  <td>
                    {j.finishedAt ? (
                      <span className={j.failed > 0 ? 'badge warn' : 'badge ok'}>
                        {j.succeeded}/{j.total} ok
                      </span>
                    ) : (
                      <span className="badge">running…</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="dashboard-shortcuts">
        <button onClick={() => onNavigate('templates')}>Browse templates</button>
        <button onClick={() => onNavigate('presets')}>Manage mapping presets</button>
      </div>
    </div>
  )
}
