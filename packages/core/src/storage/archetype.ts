import { ComponentsOfTypes, ComponentType } from "../component"
import { mutableRemoveUnordered } from "../util/array"
import {
  Archetype,
  Chunk,
  ChunkLocation,
  ChunkSet,
  Storage,
} from "./storage_types"

function createChunkSet<T extends ComponentType[]>(): ChunkSet<T> {
  return {
    chunks: [],
  }
}

export function createArchetype<T extends ComponentType[]>(
  storage: Storage,
  flags: number[],
  size: number,
): Archetype<T> {
  const filter = flags.reduce((a, f) => a | f, 0)
  const sets = [createChunkSet<T>()]

  function insert(components: ComponentsOfTypes<T>): ChunkLocation {
    const f = components.reduce((a, c) => a | storage.flags[c.name], 0)

    if ((f & filter) !== f) {
      throw new Error("Invalid component insert.")
    }

    let set: ChunkSet<T>
    let setIdx = 0

    // TODO: Defragment and improve iteration speed here.
    while ((set = sets[setIdx]) && set.chunks.length === size) {
      setIdx++
    }

    if (!set) {
      set = createChunkSet()
      setIdx = sets.push(set) - 1
    }

    const chunk: Chunk<T> = { components, changed: new Set() }
    const chunkIdx = set.chunks.push(chunk) - 1

    return [filter, setIdx, chunkIdx]
  }

  function remove(location: ChunkLocation) {
    const [, setIdx, chunkIdx] = location
    const { chunks: storage } = sets[setIdx]

    mutableRemoveUnordered(storage, storage[chunkIdx])
  }

  const unsafe_read_indices = []

  function* read(outFlags: number[], out: ComponentsOfTypes<T>) {
    // Calculate the index of each outgoing component.
    for (let i = 0; i < flags.length; i++) {
      unsafe_read_indices[i] = outFlags.indexOf(flags[i])
    }

    for (let i = 0; i < sets.length; i++) {
      const set = sets[i]
      for (let j = 0; j < set.chunks.length; j++) {
        const chunk = set.chunks[j]
        for (let k = 0; k < flags.length; k++) {
          out[unsafe_read_indices[k]] = chunk.components[k]
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
