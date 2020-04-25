import { createStorage } from "./storage"
import { query } from "./query"
import { changed } from "./filter"

describe("Storage (integration)", () => {
  it("stores components and supports execution of queries", () => {
    const storage = createStorage(3)
    const ComponentA = { name: "A", schema: {} }
    const ComponentB = { name: "B", schema: {} }
    const ComponentC = { name: "C", schema: {} }

    storage.register(ComponentA)
    storage.register(ComponentB)
    storage.register(ComponentC)
    const data = [
      [{ name: "A" }],
      [{ name: "A" }, { name: "C" }],
      [{ name: "B" }],
      [{ name: "A" }, { name: "B" }, { name: "C" }],
    ]
    data.forEach((c, i) => storage.insert(i, c))

    const result1 = Array.from(query(ComponentA).run(storage))
    const result2 = Array.from(query(ComponentB, ComponentA).run(storage))
    const result3 = Array.from(query(ComponentC).run(storage))

    expect(result1.length).toBe(3)
    expect(result2.length).toBe(1)
    expect(result3.length).toBe(2)
  })

  it("supports execution of filtered (tagged) queries", () => {
    const storage = createStorage(3)
    const ComponentA = { name: "A", schema: {} }
    const ComponentB = { name: "B", schema: {} }

    storage.register(ComponentA)
    storage.register(ComponentB)

    const data = [[{ name: "A" }], [{ name: "A" }, { name: "B" }]]
    const entities = data.map((c, i) => storage.insert(i, c))

    storage.tag(entities[0], 1)
    storage.tag(entities[1], 1 | 2)

    const result1 = Array.from(query(ComponentA).filter(1).run(storage))
    const result2 = Array.from(
      query(ComponentA)
        .filter(1 | 2)
        .run(storage),
    )

    storage.untag(entities[0], 1)
    storage.untag(entities[1], 2)

    const result3 = Array.from(
      query(ComponentA)
        .filter(1 | 2)
        .run(storage),
    )
    const result4 = Array.from(query(ComponentA).filter(1).run(storage))

    expect(result1.length).toBe(2)
    expect(result2.length).toBe(1)
    expect(result3.length).toBe(0)
    expect(result4.length).toBe(1)
  })

  it("detects changed entities", () => {
    const storage = createStorage(3)
    const ComponentA = { name: "A", schema: {} }

    storage.register(ComponentA)

    const data = [[{ name: "A" }], [{ name: "A" }]]
    const entities = data.map((c, i) => storage.insert(i, c))

    expect(
      Array.from(query(ComponentA).filter(changed).run(storage)).length,
    ).toBe(2)
    expect(
      Array.from(query(ComponentA).filter(changed).run(storage)).length,
    ).toBe(0)

    storage.bump(entities[0])

    expect(
      Array.from(query(ComponentA).filter(changed).run(storage)).length,
    ).toBe(1)
    expect(
      Array.from(query(ComponentA).filter(changed).run(storage)).length,
    ).toBe(0)
  })
})
