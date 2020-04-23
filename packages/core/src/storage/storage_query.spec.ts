import { query } from "./storage_query"
import { Storage } from "./storage_types"

describe("query", () => {
  const ComponentA = {
    name: "A",
    schema: {},
  }
  const ComponentB = {
    name: "B",
    schema: {},
  }
  const ComponentC = {
    name: "C",
    schema: {},
  }
  const storage: Storage = {
    flags: {
      A: 1,
      B: 2,
      C: 4,
    },
    archetypes: new Map([
      [
        1 | 2,
        {
          filter: 1 | 2,
          insert: jest.fn(),
          remove: jest.fn(),
          read: jest.fn().mockImplementation(function* () {
            yield [{ name: "A" }, { name: "B" }]
          }),
        },
      ],
      [
        4,
        {
          filter: 4,
          insert: jest.fn(),
          remove: jest.fn(),
          read: jest.fn().mockImplementation(function* () {
            yield [{ name: "C" }]
            yield [{ name: "C" }]
          }),
        },
      ],
    ]),
    insert: jest.fn(),
    register: jest.fn(),
    remove: jest.fn(),
    mut: jest.fn(),
  }

  it("yields a collection of components from component storage with simple queries", () => {
    const test = query(ComponentA)
    const result = Array.from(test.run(storage))

    expect(result.length).toBe(1)
    expect(result[0][0].name).toBe("A")
  })
  it("yields a collection of components from component storage with complex queries", () => {
    const test = query(ComponentA, ComponentB)
    const result = Array.from(test.run(storage))

    expect(result.length).toBe(1)
    expect(result[0][0].name).toBe("A")
    expect(result[0][1].name).toBe("B")
  })
  it("yields collections of multiple components", () => {
    const test = query(ComponentC)
    const result = Array.from(test.run(storage))

    expect(result.length).toBe(2)
    expect(result[0][0].name).toBe("C")
    expect(result[1][0].name).toBe("C")
  })
  it("does not provide results when there are no matches", () => {
    const test = query(ComponentB, ComponentC)
    const result = Array.from(test.run(storage))

    expect(result.length).toBe(0)
  })
  it("supports extending of queries with additional component types", () => {
    const test = query(ComponentA).filter(ComponentB)
    const result = Array.from(test.run(storage))

    expect(result[0].length).toBe(2)
    expect(result[0][0].name).toBe("A")
    expect(result[0][1].name).toBe("B")
  })
})
