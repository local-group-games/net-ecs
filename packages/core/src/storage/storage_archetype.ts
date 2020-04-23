import { ComponentsOfTypes, ComponentType } from "../component"
import { mutableRemoveUnordered } from "../util/array"
import {
  StorageArchetype,
  Chunk,
  ChunkLocation,
  ChunkSet,
  Storage,
} from "./storage_types"

function createChunkSet<T extends ComponentType[]>(): ChunkSet<T> {
  return {
    chunks: [],
    layout: [],
  }
}

export function createStorageArchetype<T extends ComponentType[]>(
  storage: Storage,
  flags: number[],
  size: number,
): StorageArchetype<T> {
  const filter = flags.reduce((a, f) => a | f, 0)
  const sets = [createChunkSet<T>()]

  function insert(components: ComponentsOfTypes<T>): ChunkLocation {
    const f = components.reduce((a, c) => a | storage.flags[c.name], 0)

    if ((f & filter) !== f) {
      throw new Error("Invalid component insert.")
    }

    let set: ChunkSet<T>
    let i = 0

    // TODO: Defragment and improve iteration speed here.
    while ((set = sets[i]) && set.chunks.length === size) {
      i++
    }

    if (!set) {
      set = createChunkSet()
      i = sets.push(set) - 1
    }

    const chunk: Chunk<T> = { components, changed: new Set() }
    const s = set.chunks.push(chunk) - 1

    return [filter, i, s]
  }

  function remove(location: ChunkLocation) {
    const [, setIdx, chunkIdx] = location
    const { chunks: storage } = sets[setIdx]

    mutableRemoveUnordered(storage, storage[chunkIdx])
  }

  function* read(flags: number[], out: ComponentsOfTypes<T>) {
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i]
      for (let j = 0; j < set.chunks.length; j++) {
        const chunk = set.chunks[j]
        for (let k = 0; k < flags.length; k++) {
          const idx = set.layout.indexOf(flags[k])
          out[k] = chunk.components[idx]
        }
        yield out as ComponentsOfTypes<T>
      }
    }
  }

  return {
    remove,
    insert,
    filter,
    read,
  }
}
