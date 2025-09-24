export type DataRecord = Record<string, string | number>

function toNumber(value: string | number): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

export function parseCsv(content: string): DataRecord[] {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (!lines.length) {
    return []
  }

  const headers = parseCsvLine(lines[0])
  const rows: DataRecord[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index])
    if (!values.length) continue
    const row: DataRecord = {}
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? ""
    })
    rows.push(row)
  }

  return rows
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  if (current.length || line.endsWith(",")) {
    values.push(current.trim())
  }

  return values
}

export interface TrendPoint {
  label: string
  value: number
}

export interface AnalysisResult {
  summary: string
  insights: string[]
  kpis: { label: string; value: string }[]
  trends: TrendPoint[]
  table: {
    headers: string[]
    rows: (string | number)[][]
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
}

function describeChange(metric: string, value: number, avg: number): string {
  if (avg === 0) return `${metric} stayed flat.`
  const delta = value - avg
  const percentage = (delta / avg) * 100
  const rounded = Math.abs(percentage) < 0.5 ? percentage.toFixed(2) : Math.round(percentage)
  if (delta > 0) {
    return `${metric} is up ${rounded}% vs. the rolling average.`
  }
  if (delta < 0) {
    return `${metric} dipped ${Math.abs(Number(rounded))}% compared to the average.`
  }
  return `${metric} is right on the average.`
}

export function analyzeRecords(records: DataRecord[]): AnalysisResult {
  if (!records.length) {
    return {
      summary: "No rows detected in the supplied data.",
      insights: ["Upload a CSV or JSON file with at least one row to generate an analysis."],
      kpis: [],
      trends: [],
      table: { headers: [], rows: [] },
    }
  }

  const numericKeys = new Set<string>()
  const stringKeys = new Set<string>()

  records.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      const numericValue = toNumber(value)
      if (numericValue !== null) {
        numericKeys.add(key)
      } else if (typeof value === "string") {
        stringKeys.add(key)
      }
    })
  })

  const numericFields = Array.from(numericKeys)
  const dimensionKey = Array.from(stringKeys)[0]
  const firstNumericKey = numericFields[0]

  const totals: Record<string, number> = {}
  const averages: Record<string, number> = {}

  numericFields.forEach((field) => {
    let sum = 0
    let count = 0
    records.forEach((record) => {
      const numericValue = toNumber(record[field])
      if (numericValue !== null) {
        sum += numericValue
        count += 1
      }
    })
    totals[field] = sum
    averages[field] = count ? sum / count : 0
  })

  const kpis = numericFields.slice(0, 3).map((field) => ({
    label: `Total ${field}`,
    value: formatNumber(totals[field]),
  }))

  if (firstNumericKey) {
    kpis.push({
      label: `Average ${firstNumericKey}`,
      value: formatNumber(averages[firstNumericKey]),
    })
  }

  const grouped: Record<string, number> = {}
  if (dimensionKey && firstNumericKey) {
    records.forEach((record) => {
      const bucket = String(record[dimensionKey] ?? "Unknown")
      const numericValue = toNumber(record[firstNumericKey]) ?? 0
      grouped[bucket] = (grouped[bucket] ?? 0) + numericValue
    })
  }

  const trends: TrendPoint[] = Object.entries(grouped)
    .sort(([, valueA], [, valueB]) => valueB - valueA)
    .slice(0, 8)
    .map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }))

  const insights: string[] = []
  if (dimensionKey && trends.length) {
    const best = trends[0]
    insights.push(`${best.label} leads on ${firstNumericKey ?? "the primary metric"} with ${formatNumber(best.value)}.`)
    if (trends.length > 1) {
      const trailing = trends[trends.length - 1]
      insights.push(`${trailing.label} trails with ${formatNumber(trailing.value)}.`)
    }
  }

  if (firstNumericKey) {
    const latest = toNumber(records[records.length - 1][firstNumericKey]) ?? 0
    insights.push(describeChange(firstNumericKey, latest, averages[firstNumericKey]))
  }

  const summaryLines = [
    `${records.length} rows processed.`,
    numericFields.length
      ? `Key measures: ${numericFields.map((field) => `${field} (total ${formatNumber(totals[field])})`).join(", ")}.`
      : "No numeric measures detected.",
    dimensionKey ? `Primary grouping: ${dimensionKey}.` : "No categorical dimensions found.",
  ]

  const tableHeaders = dimensionKey ? [dimensionKey, ...(numericFields.length ? [firstNumericKey!] : [])] : numericFields.slice(0, 2)
  const tableRows: (string | number)[][] = []

  if (dimensionKey && firstNumericKey) {
    trends.slice(0, 6).forEach(({ label, value }) => {
      tableRows.push([label, Number(value.toFixed(2))])
    })
  } else {
    records.slice(0, 6).forEach((record) => {
      tableRows.push(tableHeaders.map((header) => record[header] ?? ""))
    })
  }

  return {
    summary: summaryLines.join(" "),
    insights,
    kpis,
    trends,
    table: {
      headers: tableHeaders,
      rows: tableRows,
    },
  }
}
