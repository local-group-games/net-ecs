import { ComponentsOf, ComponentType } from "../component"
import { arrayOf } from "../util"
import { Filter, tag } from "./filter"
import { Archetype, Storage } from "./storage_types"

export type Query<T extends ComponentType[]> = {
  filter(...filters: (Filter | number)[]): Query<T>
  run(storage: Storage): IterableIterator<ComponentsOf<T>>
}

export function query<T extends ComponentType[]>(...selectors: T): Query<T> {
  const len = selectors.length
  const tmpResult = arrayOf<T>(len)
  const tmpFlags = arrayOf<number>(len)
  const tmpFilters = arrayOf<Filter>()

  function filter(...filters: (Filter | number)[]) {
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i]
      if (typeof f === "number") {
        tmpFilters.push(tag(f))
      } else {
        tmpFilters.push(f)
      }
    }

    return query
  }

  function* run(storage: Storage) {
    let filter = 0

    if (!storage) {
      throw new Error("Storage not provided.")
    }

    for (let i = 0; i < len; i++) {
      const flag = storage.flags[selectors[i].name]
      tmpFlags[i] = flag
      filter = filter | flag
    }

    for (let i = 0; i < tmpFilters.length; i++) {
      tmpFilters[i].bind(storage)
    }

    for (const archetype of storage.archetypes.values()) {
      if ((archetype.filter & filter) === filter) {
        yield* (archetype as Archetype<T>).read(tmpFlags, tmpFilters, tmpResult)
      }
    }
  }

  const query = { filter, run }

  return query
}
