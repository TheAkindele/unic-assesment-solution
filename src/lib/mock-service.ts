export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface MockRequest {
  url: string
  method: HttpMethod
  headers: Headers
  bodyText: string | null
  json<T = unknown>(): Promise<T>
  text(): Promise<string | null>
}

export interface MockResponseInit {
  status?: number
  headers?: Record<string, string>
  body?: unknown
  delayMs?: number
}

export type MockResolver = (request: MockRequest) => Promise<MockResponseInit> | MockResponseInit

export interface MockHandler {
  method: HttpMethod
  matcher: RegExp | string
  resolver: MockResolver
}

interface InternalMockRequest extends MockRequest {
  clone(): InternalMockRequest
}

const registryKey = Symbol.for("__AI_AGENT_MSW_REGISTRY__")

type MockRegistry = {
  handlers: MockHandler[]
  isPatched: boolean
}

function ensureRegistry(): MockRegistry {
  const globalScope = globalThis as Record<string | symbol, unknown>
  if (!globalScope[registryKey]) {
    globalScope[registryKey] = { handlers: [], isPatched: false } satisfies MockRegistry
  }
  return globalScope[registryKey] as MockRegistry
}

function createMockRequest(input: RequestInfo | URL, init?: RequestInit): InternalMockRequest {
  const request = new Request(input, init)
  const bodyPromise = request.clone().text().catch(() => null)

  const mockRequest: InternalMockRequest = {
    url: request.url,
    method: (request.method || "GET").toUpperCase() as HttpMethod,
    headers: request.headers,
    bodyText: null,
    async json<T = unknown>() {
      const text = await mockRequest.text()
      return text ? (JSON.parse(text) as T) : ({} as T)
    },
    async text() {
      if (mockRequest.bodyText !== null) return mockRequest.bodyText
      mockRequest.bodyText = await bodyPromise
      return mockRequest.bodyText
    },
    clone() {
      const cloned = createMockRequest(request.clone())
      cloned.bodyText = mockRequest.bodyText
      return cloned as InternalMockRequest
    },
  }

  return mockRequest
}

async function resolveHandler(handler: MockHandler, request: InternalMockRequest) {
  const result = await handler.resolver(request)
  const status = result.status ?? 200
  const headers = new Headers(result.headers ?? {})
  let body: BodyInit | null = null

  if (result.body !== undefined && result.body !== null) {
    if (typeof result.body === "string" || result.body instanceof Blob || result.body instanceof ArrayBuffer) {
      body = result.body as BodyInit
    } else {
      body = JSON.stringify(result.body)
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json")
      }
    }
  }

  if (result.delayMs && result.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, result.delayMs))
  }

  return new Response(body, { status, headers })
}

function matches(handler: MockHandler, url: string, method: string) {
  if (handler.method !== method) return false
  if (typeof handler.matcher === "string") {
    return url.endsWith(handler.matcher)
  }
  return handler.matcher.test(url)
}

function patchFetch() {
  const registry = ensureRegistry()
  if (registry.isPatched) return
  const originalFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = createMockRequest(input, init)
    const handler = registry.handlers.find((candidate) => matches(candidate, request.url, request.method))

    if (!handler) {
      return originalFetch(input, init)
    }

    const clonedRequest = request.clone()

    try {
      const response = await resolveHandler(handler, clonedRequest)
      return response
    } catch (error) {
      console.error("Mock handler failed", error)
      return new Response("Mock handler error", { status: 500 })
    }
  }

  registry.isPatched = true
}

export function setupMockServiceWorker(...handlers: MockHandler[]) {
  const registry = ensureRegistry()
  registry.handlers.push(...handlers)
  patchFetch()
}

export function resetMocks() {
  const registry = ensureRegistry()
  registry.handlers = []
}
