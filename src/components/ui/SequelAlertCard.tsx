'use client'
import type { SequelAlert } from '@/lib/types'

const STATUS_CONFIG = {
  available: {
    label: 'Available Now',
    color: '#4CAF50',
    bg: 'rgba(76,175,80,0.1)',
    border: 'rgba(76,175,80,0.2)',
    icon: '▶',
  },
  upcoming: {
    label: 'Coming Soon',
    color: '#6C63FF',
    bg: 'rgba(108,99,255,0.1)',
    border: 'rgba(108,99,255,0.2)',
    icon: '🔔',
  },
  in_progress: {
    label: 'In Your List',
    color: '#FF9800',
    bg: 'rgba(255,152,0,0.1)',
    border: 'rgba(255,152,0,0.2)',
    icon: '⏸',
  },
  watching: {
    label: 'Watching',
    color: '#00BCD4',
    bg: 'rgba(0,188,212,0.1)',
    border: 'rgba(0,188,212,0.2)',
    icon: '▶',
  },
}

export default function SequelAlertCard({ alert }: { alert: SequelAlert }) {
  const config = STATUS_CONFIG[alert.alert_status]

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 transition-all duration-200"
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      {/* Franchise cover */}
      <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
        {alert.franchise_cover && (
          <img
            src={alert.franchise_cover}
            alt={alert.franchise_title}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
          After completing
          <span className="font-semibold ml-1" style={{ color: 'var(--text-primary)' }}>
            {alert.last_watched.title}
          </span>
        </p>
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
          {alert.next_entry.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}
          >
            {config.icon} {config.label}
          </span>
          {alert.next_entry.season && (
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {alert.next_entry.season}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {alert.next_entry.type}
          </span>
        </div>
      </div>

      {/* AniList link */}
      <a
        href={`https://anilist.co/anime/${alert.next_entry.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-150"
        style={{
          backgroundColor: config.color,
          color: '#fff',
        }}
      >
        View →
      </a>
    </div>
  )
}
