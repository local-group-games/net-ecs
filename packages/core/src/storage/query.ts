import { ComponentsOfTypes, ComponentType } from "../component"
import { arrayOf } from "../util"
import { Storage, Archetype } from "./storage_types"
import { Filter } from "./filter"

export type Query<T extends ComponentType[]> = {
  bind(storage: Storage): Query<T>
  run(storage: Storage): IterableIterator<ComponentsOfTypes<T>>
  filter(...filters: (Filter | number)[]): Query<T>
}

export function query<T extends ComponentType[]>(...selectors: T): Query<T> {
  const len = selectors.length
  const tmp_result = arrayOf<T>(len)
  const tmp_flags = arrayOf<number>(len)
  const tmp_filters = arrayOf<Filter>()

  let s: Storage
  let tag = 0

  function filter(...filters: (Filter | number)[]) {
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i]
      if (typeof f === "number") {
        tag |= f
      } else {
        tmp_filters.push(f)
      }
    }

    return query
  }

  function bind(storage: Storage) {
    s = storage
    return query
  }

  function* run(storage: Storage = s) {
    let filter = 0

    if (!storage) {
      throw new Error("Storage not provided.")
    }

    for (let i = 0; i < len; i++) {
      const flag = storage.flags[selectors[i].name]
      tmp_flags[i] = flag
      filter = filter | flag
    }

    for (const archetype of storage.archetypes.values()) {
      if ((archetype.filter & filter) === filter) {
        yield* (archetype as Archetype<T>).read(
          tmp_flags,
          tmp_result,
          tag,
          tmp_filters,
        )
      }
    }
  }

  const query = { bind, run, filter }

  return query
}
