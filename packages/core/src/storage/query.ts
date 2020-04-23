import { ComponentsOfTypes, ComponentType } from "../component"
import { Storage } from "./storage_types"

export type Query<T extends ComponentType[]> = {
  filter<F>(f: F): Query<T & F>
}

function arrayOf<T = undefined>(len: number, t?: T) {
  return Array(len).fill(t)
}

export function query<T extends ComponentType[]>(...types: ComponentType[]) {
  const len = types.length
  const unsafe_result = arrayOf(len) as ComponentsOfTypes<T>
  const unsafe_flags = arrayOf(len) as number[]

  function filter(type: ComponentType) {
    return query(...types, type)
  }

  function* run(storage: Storage) {
    let filter = 0

    for (let i = 0; i < len; i++) {
      const flag = storage.flags[types[i].name]
      unsafe_flags[i] = flag
      filter = filter | flag
    }

    for (const archetype of storage.archetypes.values()) {
      if ((archetype.filter & filter) === filter) {
        yield* archetype.read(unsafe_flags, unsafe_result)
      }
    }
  }

  return { run, filter }
}
