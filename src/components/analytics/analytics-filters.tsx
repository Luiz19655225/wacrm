"use client"

import { cn } from "@/lib/utils"

export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom'

export interface DateRange {
  from: string
  to: string
}

interface Props {
  preset: DatePreset
  customFrom: string
  customTo: string
  onPresetChange: (preset: DatePreset, range: DateRange) => void
  onCustomChange: (from: string, to: string) => void
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today',     label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: '7d',        label: '7 dias' },
  { id: '30d',       label: '30 dias' },
  { id: '90d',       label: '90 dias' },
  { id: 'custom',    label: 'Personalizado' },
]

function toStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function resolvePresetRange(preset: DatePreset): DateRange {
  const today = new Date()
  const todayStr = toStr(today)
  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr }
    case 'yesterday': {
      const y = new Date(today.getTime() - 86400000)
      const s = toStr(y)
      return { from: s, to: s }
    }
    case '7d': {
      const f = new Date(today.getTime() - 6 * 86400000)
      return { from: toStr(f), to: todayStr }
    }
    case '30d': {
      const f = new Date(today.getTime() - 29 * 86400000)
      return { from: toStr(f), to: todayStr }
    }
    case '90d': {
      const f = new Date(today.getTime() - 89 * 86400000)
      return { from: toStr(f), to: todayStr }
    }
    default:
      return { from: todayStr, to: todayStr }
  }
}

export function AnalyticsFilters({ preset, customFrom, customTo, onPresetChange, onCustomChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="analytics-filters">
      {PRESETS.map(p => (
        <button
          key={p.id}
          onClick={() => {
            if (p.id !== 'custom') onPresetChange(p.id, resolvePresetRange(p.id))
            else onPresetChange('custom', { from: customFrom, to: customTo })
          }}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            preset === p.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
          data-testid={`filter-${p.id}`}
        >
          {p.label}
        </button>
      ))}

      {preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={e => onCustomChange(e.target.value, customTo)}
            className="rounded-md border border-border bg-muted px-2 py-1 text-sm"
            data-testid="filter-custom-from"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={e => onCustomChange(customFrom, e.target.value)}
            className="rounded-md border border-border bg-muted px-2 py-1 text-sm"
            data-testid="filter-custom-to"
          />
        </div>
      )}
    </div>
  )
}
