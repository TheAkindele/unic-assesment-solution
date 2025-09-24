import { analyzeRecords, parseCsv } from "../lib/analysis"
import type { MockHandler } from "../lib/mock-service"

const USERNAME = "agent"
const PASSWORD = "openai123"

const weatherSnapshots: Record<string, { summary: string; temperature: number; humidity: number }> = {
  "san francisco": {
    summary: "Foggy morning clearing to sun in the afternoon.",
    temperature: 68,
    humidity: 72,
  },
  seattle: {
    summary: "Light rain with intermittent clear pockets.",
    temperature: 58,
    humidity: 80,
  },
  london: {
    summary: "Overcast with a brief drizzle expected after lunch.",
    temperature: 61,
    humidity: 77,
  },
}

let dailyChatRequests = 0
let dailyAnalysisRequests = 0

function formatToolCall(tool: string, content: string) {
  return `Tool(${tool}) => ${content}`
}

function buildLongResponse(core: string): string {
  return [
    core,
    "\n\n",
    "To keep the conversation productive, I chained a creative ideation pass with a pragmatic review stage.",
    " The creative model outlined possibilities, while the analyst model trimmed them to the essentials.",
    "\n\n",
    "If you need to go deeper, ask for a follow-up report and I can expand with additional structured tables or timeline breakdowns.",
  ].join("")
}

function simulateCalculator(input: string): string | null {
  const match = input.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const [, left, operator, right] = match
  const a = Number(left)
  const b = Number(right)
  let result = 0
  switch (operator) {
    case "+":
      result = a + b
      break
    case "-":
      result = a - b
      break
    case "*":
      result = a * b
      break
    case "/":
      result = b === 0 ? NaN : a / b
      break
  }
  if (!Number.isFinite(result)) {
    return "Computation failed (divide by zero?)."
  }
  return `${a} ${operator} ${b} = ${Number(result.toFixed(2))}`
}

function simulateWeatherLookup(message: string) {
  const locationMatch = message.match(/weather\s+in\s+([a-zA-Z\s]+)/i)
  if (!locationMatch) return null
  const locationKey = locationMatch[1].trim().toLowerCase()
  const snapshot = weatherSnapshots[locationKey]
  if (!snapshot) {
    return `No weather data for ${locationMatch[1].trim()}.`
  }
  return `${snapshot.summary} Currently ${snapshot.temperature}°F with humidity at ${snapshot.humidity}%.`
}

function createChatHandler(): MockHandler {
  return {
    method: "POST",
    matcher: "/api/chat",
    async resolver(request) {
      dailyChatRequests += 1
      if (dailyChatRequests % 7 === 0) {
        return {
          status: 429,
          body: { message: "Rate limit reached. Please retry in a few seconds." },
        }
      }

      const payload = await request.json<{ message: string; history: { role: string; content: string }[]; model: string }>()
      const text = payload.message.trim()

      if (!text) {
        return {
          status: 400,
          body: { message: "Message must not be empty." },
        }
      }

      if (/fail|crash/i.test(text)) {
        return {
          status: 500,
          body: { message: "Mock model failure triggered." },
        }
      }

      const creativeIdea = `Creative take: ${text.replace(/^[a-z]/, (match) => match.toUpperCase())}.`
      const calculatorOutput = simulateCalculator(text)
      const weatherOutput = simulateWeatherLookup(text)

      const toolCalls: string[] = []
      if (calculatorOutput) {
        toolCalls.push(formatToolCall("calculator", calculatorOutput))
      }
      if (weatherOutput) {
        toolCalls.push(formatToolCall("weather", weatherOutput))
      }

      const refineSegments = [
        "Refined answer:",
        calculatorOutput ? ` Using calculator insights (${calculatorOutput}).` : "",
        weatherOutput ? ` Included latest weather: ${weatherOutput}` : "",
        " Final recommendation: stay outcome-driven and capture follow-up actions.",
      ]

      const finalReply = buildLongResponse(refineSegments.join(""))

      return {
        delayMs: text.length > 40 ? 850 : 450,
        body: {
          steps: [
            {
              id: `creative-${Date.now()}`,
              role: "assistant",
              label: "Creative draft",
              content: creativeIdea,
            },
            ...(toolCalls.length
              ? [
                  {
                    id: `tool-${Date.now()}`,
                    role: "tool",
                    label: "Tools",
                    content: toolCalls.join("\n"),
                  },
                ]
              : []),
            {
              id: `refine-${Date.now()}`,
              role: "assistant",
              label: "Refined answer",
              content: finalReply,
            },
          ],
          usage: {
            totalTokens: Math.min(1200, 150 + text.length * 4),
            model: payload.model,
            latencyMs: text.length > 40 ? 820 : 420,
          },
        },
      }
    },
  }
}

function createLoginHandler(): MockHandler {
  return {
    method: "POST",
    matcher: "/api/auth/login",
    async resolver(request) {
      const credentials = await request.json<{ username: string; password: string }>()

      if (credentials.username !== USERNAME || credentials.password !== PASSWORD) {
        return {
          status: 401,
          body: { message: "Invalid credentials. Use agent / openai123." },
        }
      }

      return {
        delayMs: 600,
        body: {
          token: "mock-token-123",
          user: {
            id: "demo-user",
            name: "Avery Agent",
            title: "AI Automation Lead",
            organization: "Evolve Analytics",
          },
          stats: {
            chatRequests: dailyChatRequests,
            analysisRuns: dailyAnalysisRequests,
            lastLogin: new Date().toISOString(),
          },
        },
      }
    },
  }
}

function createToolsHandler(): MockHandler {
  return {
    method: "GET",
    matcher: "/api/tools",
    resolver() {
      return {
        delayMs: 300,
        body: {
          tools: [
            {
              id: "chat",
              name: "Conversational AI",
              description: "Chain-of-thought chat assistant with calculator and weather tools integrated.",
              route: "/tools/chat",
              latency: "~450ms",
              status: "ready",
            },
            {
              id: "analysis",
              name: "Data Analyst",
              description: "Upload CSV/JSON for KPI extraction, trend summaries, and visual cues.",
              route: "/tools/analysis",
              latency: "~900ms",
              status: "ready",
            },
          ],
        },
      }
    },
  }
}

function createAnalysisHandler(): MockHandler {
  return {
    method: "POST",
    matcher: "/api/analysis",
    async resolver(request) {
      dailyAnalysisRequests += 1
      const payload = await request.json<{ content: string; fileType: "csv" | "json"; model: string }>()

      if (!payload.content) {
        return {
          status: 400,
          body: { message: "No content detected." },
        }
      }

      if (payload.model === "ultra-slow" && dailyAnalysisRequests % 3 === 0) {
        return {
          status: 503,
          body: { message: "Model temporarily overloaded. Try a faster tier." },
        }
      }

      let records
      if (payload.fileType === "json") {
        try {
          const parsed = JSON.parse(payload.content)
          records = Array.isArray(parsed) ? parsed : []
        } catch {
          return {
            status: 400,
            body: { message: "Invalid JSON." },
          }
        }
      } else {
        records = parseCsv(payload.content)
      }

      const result = analyzeRecords(records)

      return {
        delayMs: 750,
        body: {
          result,
          model: payload.model,
          largeNarrative: buildLongResponse(result.summary),
        },
      }
    },
  }
}

export const handlers: MockHandler[] = [
  createLoginHandler(),
  createChatHandler(),
  createToolsHandler(),
  createAnalysisHandler(),
]
