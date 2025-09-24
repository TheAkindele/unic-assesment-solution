import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/features/auth/login-form"

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16">
      <section className="grid w-full gap-10 rounded-2xl border border-slate-200 bg-white p-10 shadow-lg dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <h1 id="login-title" className="text-3xl font-semibold leading-tight">
            AI Agent Dashboard
          </h1>
          <p className="max-w-xl text-slate-600 dark:text-slate-300">
            Sign in with the provided demo credentials to explore a protected dashboard, a mock LLM chat experience, and a CSV/JSON
            analysis workflow. All network calls are mocked so the demo is reliable offline.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>Chain-of-thought chat with calculator & weather tools.</li>
            <li>Upload structured data for KPI extraction and trend charts.</li>
            <li>State persisted locally so you stay signed in between visits.</li>
          </ul>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <Link
              href="https://github.com/TheAkindele/unic-assesment-solution"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              View documentation
            </Link>
            <span className="text-xs text-slate-400">Links open in a new tab.</span>
          </div>
        </div>
        <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-950">
          <Suspense fallback={<span className="text-sm text-slate-500">Loading form…</span>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
