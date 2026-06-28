export function buildDateRangeSeries(from: string, to: string): string[] {
  const dates: string[] = []
  const cur = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T00:00:00.000Z`)
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

export function parseRange(searchParams: URLSearchParams): {
  from: string
  to: string
  fromIso: string
  toIso: string
} {
  const todayStr = new Date().toISOString().split('T')[0]
  const from = searchParams.get('from') ?? todayStr
  const to = searchParams.get('to') ?? todayStr
  return { from, to, fromIso: `${from}T00:00:00.000Z`, toIso: `${to}T23:59:59.999Z` }
}

export function groupByDate<T extends { ts: string }>(
  dates: string[],
  rows: T[],
  getTs: (r: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>(dates.map(d => [d, []]))
  for (const r of rows) {
    const d = getTs(r).split('T')[0]
    map.get(d)?.push(r)
  }
  return map
}
