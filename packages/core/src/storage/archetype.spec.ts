import { createArchetype } from "./archetype"
import { Storage } from "./storage_types"

describe("Archetype", () => {
  const storage: Storage = {
    flags: {
      A: 1,
      B: 2,
      C: 4,
    },
    archetypes: new Map(),
    insert: jest.fn(),
    register: jest.fn(),
    remove: jest.fn(),
    mut: jest.fn(),
  }
  it("yields results in the correct order", () => {
    const archetype = createArchetype(storage, [1, 4], 5)
    const components = [{ name: "A" }, { name: "C" }]

    // Insert components in order "A", "C"
    archetype.insert(components)

    // Read using flags in the order of "C", "A"
    const result = Array.from(archetype.read([4, 1], []))

    expect(result.length).toBe(1)
    expect(result[0][0]).toBe(components[1]) // C
    expect(result[0][1]).toBe(components[0]) // A
  })
  it("throws an error on inserting an invalid set of components", () => {
    const archetype = createArchetype(storage, [1, 4], 5)
    const components = [{ name: "A" }, { name: "B" }]

    expect(() => archetype.insert(components)).toThrow()
  })
  // Location is theoretically an opaque value but we can use it to our
  // advantage to test.
  it("yields a location based on the chunk size", () => {
    const archetype = createArchetype(storage, [1], 2)
    const entities = [[{ name: "A" }], [{ name: "A" }], [{ name: "A" }]]
    const locations = entities.map(e => archetype.insert(e))

    // filters
    expect(locations[0][0]).toBe(1)
    expect(locations[1][0]).toBe(1)
    expect(locations[2][0]).toBe(1)
    // chunk set index
    expect(locations[0][1]).toBe(0)
    expect(locations[1][1]).toBe(0)
    expect(locations[2][1]).toBe(1)
    // chunk index
    expect(locations[0][2]).toBe(0)
    expect(locations[1][2]).toBe(1)
    expect(locations[2][2]).toBe(0)
  })
})
