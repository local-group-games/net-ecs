import { createStorage } from "./storage"

const { createArchetype } = require("./archetype")

jest.mock("./archetype", () => {
  return {
    createArchetype: jest.fn(() => ({
      filter: 1,
      insert: jest.fn(() => [1, 0, 0]),
      remove: jest.fn(),
      read: jest.fn(),
    })),
  }
})

describe("Storage", () => {
  it("creates a new entity for each insert", () => {
    const storage = createStorage(5)

    storage.register({
      name: "A",
      schema: {},
    })

    const entityA = storage.insert([{ name: "A" }])
    const entityB = storage.insert([{ name: "A" }])

    expect(entityA).toBe(1)
    expect(entityB).toBe(2)
  })
  it("requires component registration before insert", () => {
    const storage = createStorage(5)

    expect(() => storage.insert([{ name: "A" }])).toThrow()
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

    storage.insert([{ name: "A" }])
    storage.insert([{ name: "B" }])
    storage.insert([{ name: "A" }, { name: "B" }])

    expect(createArchetype).toHaveBeenNthCalledWith(1, storage, [1], 5)
    expect(createArchetype).toHaveBeenNthCalledWith(2, storage, [2], 5)
    expect(createArchetype).toHaveBeenNthCalledWith(3, storage, [1, 2], 5)
  })
  it("removes components from archetype while removing entities", () => {
    const storage = createStorage(5)

    storage.register({
      name: "A",
      schema: {},
    })

    const entity = storage.insert([{ name: "A" }])

    storage.remove(entity)
    expect(storage.archetypes.get(1).remove).toHaveBeenCalledWith([1, 0, 0])
  })

  afterEach(() => {
    createArchetype.mockClear()
  })
})
