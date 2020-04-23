import { createStorageArchetype } from "./storage_archetype"
import { Storage } from "./storage_types"

describe("StorageArchetype", () => {
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
  it("yields results", () => {
    const archetype = createStorageArchetype(storage, [4, 1], 5)
    const components = [{ name: "A" }, { name: "C" }]
    archetype.insert(components)
    const result = Array.from(archetype.read([1, 4], []))

    expect(result.length).toBe(1)
  })
  it("throws an error on inserting an invalid set of components", () => {
    const archetype = createStorageArchetype(storage, [4, 1], 5)
    const components = [{ name: "A" }, { name: "B" }]

    expect(() => archetype.insert(components)).toThrow()
  })
  // Location is theoretically an opaque value but we can use it to our
  // advantage to test.
  it("yields a location based on the chunk size", () => {
    const archetype = createStorageArchetype(storage, [1], 2)
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
