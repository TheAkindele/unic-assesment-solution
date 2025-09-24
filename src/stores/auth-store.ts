import { create, createJSONStorage, persist } from "@/lib/zustand"

interface UserProfile {
  id: string
  name: string
  title: string
  organization: string
}

export interface UserStats {
  chatRequests: number
  analysisRuns: number
  lastLogin: string | null
}

interface AuthState {
  user: UserProfile | null
  token: string | null
  stats: UserStats
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  incrementChat: () => void
  incrementAnalysis: () => void
}

const defaultStats: UserStats = {
  chatRequests: 0,
  analysisRuns: 0,
  lastLogin: null,
}

export const useAuthStore = create<AuthState>(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      stats: defaultStats,
      loading: false,
      error: null,
      async login(username, password) {
        set({ loading: true, error: null })
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.message ?? "Unable to authenticate")
          }

          set({
            user: data.user,
            token: data.token,
            stats: {
              chatRequests: data.stats?.chatRequests ?? 0,
              analysisRuns: data.stats?.analysisRuns ?? 0,
              lastLogin: data.stats?.lastLogin ?? new Date().toISOString(),
            },
            loading: false,
            error: null,
          })
          return true
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Login failed",
            loading: false,
          })
          return false
        }
      },
      logout() {
        set({ user: null, token: null, stats: defaultStats })
      },
      incrementChat() {
        const { stats } = get()
        set({ stats: { ...stats, chatRequests: stats.chatRequests + 1 } })
      },
      incrementAnalysis() {
        const { stats } = get()
        set({ stats: { ...stats, analysisRuns: stats.analysisRuns + 1 } })
      },
    }),
    {
      name: "ai-agent-auth",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") return undefined
        return window.localStorage
      }),
    },
  ),
)
