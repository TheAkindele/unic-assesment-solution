import { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/60 dark:bg-slate-700/60", className)} {...props} />
}
