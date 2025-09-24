import type { Metadata } from "next"
import "./globals.css"
import { AppProviders } from "@/components/providers/app-providers"

export const metadata: Metadata = {
  title: "AI Agent Dashboard",
  description: "Mock AI tooling workspace with chat and analysis demos.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
