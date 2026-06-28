export const TICK_FILL = "#64748b"

export const TOOLTIP_STYLE: React.CSSProperties = {
  fontSize: 12,
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 6,
  color: "#f8fafc",
}

export const CHART_COLORS = {
  blue:   "#3b82f6",
  green:  "#22c55e",
  amber:  "#f59e0b",
  red:    "#ef4444",
  violet: "#8b5cf6",
  cyan:   "#06b6d4",
  slate:  "#64748b",
}

export function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function fmtNumber(n: number): string {
  return n.toLocaleString('pt-BR')
}

export function fmtCurrency(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
