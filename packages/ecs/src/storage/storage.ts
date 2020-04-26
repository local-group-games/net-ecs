import { Component, ComponentType } from "../component"
import { createArchetype } from "./archetype"
import { Archetype, ChunkLocation, Storage } from "./storage_types"

export function createStorage(size: number): Storage {
  const flags: { [name: string]: number } = {}
  // Archetypes by filter.
  const archetypes = new Map<number, Archetype>()
  // Chunk locations by number.
  const locations: ChunkLocation[] = []

  let flagsSeq = 1

  function getFilter(components: Component[]) {
    return components.reduce((a, c) => a | flags[c.name], 0)
  }

  function findOrCreateArchetype(components: Component[]) {
    const filter = getFilter(components)
    let archetype = archetypes.get(filter)

    if (!archetype) {
      const aflags: { [name: string]: number } = {}
      const layout: number[] = []

      for (let i = 0; i < components.length; i++) {
        const component = components[i]
        const flag = flags[component.name]

        if (!flag) {
          throw new Error("Component type not registered.")
        }

        aflags[component.name] = flag
        layout[i] = flag
      }

      archetype = createArchetype(aflags, layout, size)
      archetypes.set(archetype.filter, archetype)
    }

    return archetype
  }

  function insert(key: number, components: Component[]) {
    const archetype = findOrCreateArchetype(components)
    const location = archetype.insert(components)

    locations[key] = location

    return key
  }

  function remove(key: number, ...components: Component[]) {
    const location = locations[key]

    if (!location) {
      throw new Error("number does not exist.")
    }

    const archetype = archetypes.get(location[0])
    const chunk = archetype.remove(location)

    if (components.length > 0) {
      const filter = getFilter(components)
      const next = chunk.components.filter(
        c => (flags[c.name] & filter) !== filter,
      )
      const archetype = findOrCreateArchetype(next)
      locations[key] = archetype.insert(next)
    } else {
      locations[key] = undefined
    }
  }

  function register(type: ComponentType) {
    if (flags[type.name]) {
      throw new Error("Component type already registered.")
    }
    flags[type.name] = flagsSeq
    flagsSeq *= 2
  }

  function bump(key: number) {
    const location = locations[key]
    const archetype = archetypes.get(location[0])

    archetype.bump(location)
  }

  function tag(key: number, tag: number) {
    const location = locations[key]
    const archetype = archetypes.get(location[0])

    archetype.tag(location, tag)
  }

  function untag(key: number, tag: number) {
    const location = locations[key]
    const archetype = archetypes.get(location[0])

    archetype.untag(location, tag)
  }

  function getComponents(key: number) {
    const location = locations[key]
    const archetype = archetypes.get(location[0])

    return archetype.get(location).components
  }

  const storage = {
    archetypes,
    flags,
    register,
    insert,
    remove,
    tag,
    untag,
    bump,
    getComponents,
  }

  return storage
}
