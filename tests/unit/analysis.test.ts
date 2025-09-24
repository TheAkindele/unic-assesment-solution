import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { analyzeRecords, parseCsv } from "../../src/lib/analysis"

const SAMPLE_CSV = `region,units,total
North,10,2500
South,5,1300
North,8,2000`

describe("analysis utilities", () => {
  it("parses CSV into records", () => {
    const rows = parseCsv(SAMPLE_CSV)
    assert.equal(rows.length, 3)
    assert.equal(rows[0].region, "North")
    assert.equal(rows[2].total, "2000")
  })

  it("summarizes numeric and categorical fields", () => {
    const records = parseCsv(SAMPLE_CSV)
    const result = analyzeRecords(records)
    assert.ok(result.summary.includes("3 rows"))
    assert.ok(result.kpis.length > 0)
    assert.ok(result.insights.length > 0)
  })
})
