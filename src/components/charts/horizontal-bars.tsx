import { TrendPoint } from "@/lib/analysis"
import { cn } from "@/lib/utils"

interface HorizontalBarsProps {
  data: TrendPoint[]
  className?: string
}

export function HorizontalBars({ data, className }: HorizontalBarsProps) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">No trend data available.</p>
  }

  const maxValue = Math.max(...data.map((point) => point.value)) || 1

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {data.map((point) => (
        <div key={point.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{point.label}</span>
            <span className="text-slate-500">{point.value.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.max(6, (point.value / maxValue) * 100)}%` }}
              aria-hidden
            />
          </div>
        </div>
      ))}
    </div>
  )
}
