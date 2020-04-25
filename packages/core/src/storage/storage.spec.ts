import { createStorage } from "./storage"

const { createArchetype } = require("./archetype")

jest.mock("./archetype", () => {
  return {
    createArchetype: jest.fn((storage, flags, size) => ({
      filter: flags.reduce((a, f) => a | f, 0),
      insert: jest.fn(),
      remove: jest.fn(),
      read: jest.fn(),
    })),
  }
})

describe("Storage", () => {
  it("returns specified entity for each insert", () => {
    const storage = createStorage(5)

    storage.register({
      name: "A",
      schema: {},
    })

    const entityA = storage.insert(1, [{ name: "A" }])
    const entityB = storage.insert(2, [{ name: "A" }])

    expect(entityA).toBe(1)
    expect(entityB).toBe(2)
  })
  it("requires component registration before insert", () => {
    const storage = createStorage(5)

    expect(() => storage.insert(1, [{ name: "A" }])).toThrow()
  })
  it("creates a new archetype for each unique combination of components", () => {
    const storage = createStorage(5)

    storage.register({
      name: "A",
      schema: {},
    })
    storage.register({
      name: "B",
      schema: {},
    })

    storage.insert(1, [{ name: "A" }])
    storage.insert(2, [{ name: "B" }])
    storage.insert(3, [{ name: "A" }, { name: "B" }])

    expect(createArchetype).toHaveBeenNthCalledWith(1, { A: 1 }, [1], 5)
    expect(createArchetype).toHaveBeenNthCalledWith(2, { B: 2 }, [2], 5)
    expect(createArchetype).toHaveBeenNthCalledWith(
      3,
      { A: 1, B: 2 },
      [1, 2],
      5,
    )
  })
  it("removes components from archetype while removing entities", () => {
    const storage = createStorage(5)

    storage.register({
      name: "A",
      schema: {},
    })

    createArchetype.mockImplementation(() => ({
      filter: 1,
      insert: jest.fn(() => [1, 0, 0]),
      remove: jest.fn(),
      read: jest.fn(),
    }))

    storage.insert(1, [{ name: "A" }])
    storage.remove(1)

    expect(storage.archetypes.get(1).remove).toHaveBeenCalledWith([1, 0, 0])
  })
  it("creates new archetypes when removing components from entities", () => {
    const storage = createStorage(1)

    storage.register({
      name: "A",
      schema: {},
    })
    storage.register({
      name: "B",
      schema: {},
    })

    const components = [{ name: "A" }, { name: "B" }]
    const location = [1 | 2, 0, 0]
    const targetLocation = [2, 0, 0]

    createArchetype.mockImplementation(() => ({
      filter: 1 | 2,
      insert: jest.fn(() => location),
      remove: jest.fn(() => ({
        components,
      })),
    }))

    storage.insert(1, components)

    createArchetype.mockImplementation(() => ({
      filter: 2,
      insert: jest.fn(() => targetLocation),
    }))

    storage.remove(1, components[0])

    expect(storage.archetypes.get(1 | 2).remove).toHaveBeenCalledWith(location)
    expect(storage.archetypes.get(2).insert).toHaveBeenCalledWith([
      components[1],
    ])
  })

  afterEach(() => {
    createArchetype.mockClear()
  })
})
