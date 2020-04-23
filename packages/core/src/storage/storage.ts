import {
  Component,
  ComponentType,
  InternalComponent,
  Mutable,
} from "../component"
import { Entity } from "../entity"
import { createArchetype } from "./archetype"
import { ChunkLocation, Storage, Archetype } from "./storage_types"

export function createStorage(size: number): Storage {
  const flags: { [name: string]: number } = {}
  const archetypes = new Map<
    number, // filter
    Archetype
  >()
  const locations: ChunkLocation[] = []

  let entity_seq = 1
  let flag_seq = 1

  function getFilter(components: InternalComponent[]) {
    return components.reduce((a, c) => a | flags[c.name], 0)
  }

  function findOrCreateArchetype(components: InternalComponent[]) {
    const filter = getFilter(components)
    let archetype = archetypes.get(filter)

    if (!archetype) {
      const _flags: number[] = []

      for (let i = 0; i < components.length; i++) {
        const c = components[i]
        const f = flags[c.name]

        if (!f) {
          throw new Error("Component type not registered.")
        }

        _flags[i] = f
      }

      archetype = createArchetype(storage, _flags, size)
      archetypes.set(archetype.filter, archetype)
    }

    return archetype
  }

  function insert(components: InternalComponent[]) {
    const entity = entity_seq
    const archetype = findOrCreateArchetype(components)
    const location = archetype.insert(components)

    locations[entity] = location
    entity_seq += 1

    return entity
  }

  function remove(entity: Entity) {
    const location = locations[entity]

    if (!location) {
      throw new Error("Entity does not exist.")
    }

    const archetype = archetypes.get(location[0])

    archetype.remove(location)
    locations[entity] = undefined
  }

  function register(type: ComponentType) {
    if (flags[type.name]) {
      throw new Error("Component type already registered.")
    }
    flags[type.name] = flag_seq
    flag_seq *= 2
  }

  function mut<T extends Component>(component: T): Mutable<T> {
    const location = locations[component.entity]
    // TODO: Mark location as modified. Queue modified locations and reset
    // on next maintain().

    return component
  }

  const storage = {
    archetypes,
    flags,
    register,
    insert,
    remove,
    mut,
  }

  return storage
}
