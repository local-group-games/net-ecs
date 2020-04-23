import { createStorage } from "./storage"
import { query } from "./query"

describe("Storage (integration)", () => {
  const storage = createStorage(3)
  const ComponentA = { name: "A", schema: {} }
  const ComponentB = { name: "B", schema: {} }
  const ComponentC = { name: "C", schema: {} }

  storage.register(ComponentA)
  storage.register(ComponentB)
  storage.register(ComponentC)

  it("stores components and supports execution of queries", () => {
    const data = [
      [{ name: "A" }],
      [{ name: "A" }, { name: "C" }],
      [{ name: "B" }],
      [{ name: "A" }, { name: "B" }, { name: "C" }],
    ]
    data.forEach(storage.insert)

    const result1 = Array.from(query(ComponentA).run(storage))
    const result2 = Array.from(query(ComponentB, ComponentA).run(storage))
    const result3 = Array.from(query(ComponentC).run(storage))

    expect(result1.length).toBe(3)
    expect(result2.length).toBe(1)
    expect(result3.length).toBe(2)
  })
})
