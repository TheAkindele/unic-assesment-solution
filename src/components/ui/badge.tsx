import { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "outline" | "success" | "warning"

const variants: Record<BadgeVariant, string> = {
  default: "bg-blue-100 text-blue-800",
  outline: "border border-slate-200 text-slate-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)} {...props} />
}
