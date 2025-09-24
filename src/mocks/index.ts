import { handlers } from "./handlers"
import { setupMockServiceWorker } from "../lib/mock-service"

let initialized = false

export function initMocks() {
  if (initialized) return
  setupMockServiceWorker(...handlers)
  initialized = true
}
