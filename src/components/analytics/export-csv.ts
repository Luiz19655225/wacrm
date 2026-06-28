export function exportCsv(rows: object[], filename: string): void {
  if (rows.length === 0) return
  const keys = Object.keys(rows[0] as Record<string, unknown>)
  const header = keys.join(';')
  const body = rows
    .map(r => keys.map(k => String((r as Record<string, unknown>)[k] ?? '').replace(/;/g, ',')).join(';'))
    .join('\n')
  const csv = `﻿${header}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
