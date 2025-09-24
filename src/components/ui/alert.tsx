import { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type AlertVariant = "info" | "success" | "warning" | "error"

const variantStyles: Record<AlertVariant, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
}

export function Alert({ className, variant = "info", ...props }: AlertProps) {
  return <div role="status" className={cn("flex w-full items-start gap-3 rounded-md border px-4 py-3 text-sm", variantStyles[variant], className)} {...props} />
}
