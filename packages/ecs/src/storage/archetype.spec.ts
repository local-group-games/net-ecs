import { createArchetype } from "./archetype"

describe("Archetype", () => {
  const flags = {
    A: 1,
    B: 2,
    C: 4,
  }
  it("yields results in the correct order", () => {
    const archetype = createArchetype(flags, [1, 4], 5)
    const components = [{ name: "A" }, { name: "C" }]

    // Insert components in order "A", "C"
    archetype.insert(components)

    // Read using flags in the order of "C", "A"
    const result = Array.from(archetype.read([4, 1], [], []))

    expect(result.length).toBe(1)
    expect(result[0][0]).toBe(components[1]) // C
    expect(result[0][1]).toBe(components[0]) // A
  })
  it("throws an error on inserting an invalid set of components", () => {
    const archetype = createArchetype(flags, [1, 4], 5)
    const components = [{ name: "A" }, { name: "B" }]

    expect(() => archetype.insert(components)).toThrow()
  })
  // Location is theoretically an opaque value but we can use it to our
  // advantage to test.
  it("yields a location based on the chunk size", () => {
    const archetype = createArchetype(flags, [1], 2)
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
  it("removes entities", () => {
    const archetype = createArchetype(flags, [1], 2)
    const entities = [
      [{ name: "A", test: 1 }],
      [{ name: "A", test: 2 }],
      [{ name: "A", test: 3 }],
    ]
    const locations = entities.map(e => archetype.insert(e))

    archetype.remove(locations[0])

    const result = Array.from(archetype.read([1], [], []))

    expect(result.length).toBe(2)
    // order is not maintained, so we check each index
    expect(result.find(r => r[0] === entities[1][0]))
    expect(result.find(r => r[0] === entities[2][0]))
  })
  it("bumps internal versions of chunks for change detection", () => {
    const archetype = createArchetype(flags, [1], 2)
    const location = archetype.insert([{ name: "A", test: 1 }])

    for (let i = 0; i < 4; i++) archetype.bump(location)

    let chunkVersion: number
    let chunkSetVersion: number

    Array.from(
      archetype.read(
        [1],
        [
          {
            matchChunk: chunk => {
              chunkVersion = chunk.version
              return true
            },
            matchChunkSet: chunkSet => {
              chunkSetVersion = chunkSet.version
              return true
            },
          },
        ],
        [],
      ),
    )

    expect(chunkVersion).toBe(5)
    expect(chunkSetVersion).toBe(5)
  })
})
