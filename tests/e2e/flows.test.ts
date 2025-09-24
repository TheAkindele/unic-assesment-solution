import { before, describe, it } from "node:test"
import assert from "node:assert/strict"
import { initMocks } from "../../src/mocks"

const SAMPLE_DATA = `region,units,total
North,10,2500
West,5,1800`

describe("end-to-end flow", () => {
  before(() => {
    initMocks()
  })

  it("authenticates the user", async () => {
    const response = await fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "agent", password: "openai123" }),
    })
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.user.name, "Avery Agent")
    assert.equal(typeof payload.token, "string")
  })

  it("runs a chat message with tool usage", async () => {
    const response = await fetch("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "calculate 4 + 5", history: [], model: "balanced" }),
    })
    assert.equal(response.status, 200)
    const payload = (await response.json()) as {
      steps: { role: string }[]
      usage: { totalTokens: number }
    }
    assert.ok(Array.isArray(payload.steps))
    assert.ok(payload.steps.some((step) => step.role === "tool"))
    assert.ok(payload.usage.totalTokens > 0)
  })

  it("analyzes uploaded data", async () => {
    const response = await fetch("http://localhost/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: SAMPLE_DATA, fileType: "csv", model: "balanced" }),
    })
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.ok(payload.result.summary.includes("rows"))
    assert.ok(payload.result.kpis.length > 0)
  })
})
