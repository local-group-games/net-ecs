import { ComponentsOf, ComponentType, Component } from "../component"
import { mutableRemoveUnordered, mutableRemove } from "../util/array"
import { Filter } from "./filter"
import { Archetype, Chunk, ChunkLocation, ChunkSet } from "./storage_types"

function createChunkSet<T extends ComponentType[]>(): ChunkSet<T> {
  return {
    tag: 0,
    chunks: [],
  }
}

export function createArchetype<T extends ComponentType[]>(
  flags: { [name: string]: number },
  layout: number[],
  size: number,
): Archetype<T> {
  const filter = layout.reduce((a, f) => a | f, 0)
  const sets = [createChunkSet<T>()]

  function insert(components: ComponentsOf<T>): ChunkLocation {
    const f = components.reduce((a, c) => a | flags[c.name], 0)

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

    const chunk: Chunk<T> = { tag: 0, components }
    const chunkIdx = set.chunks.push(chunk) - 1

    return [filter, setIdx, chunkIdx]
  }

  function remove(location: ChunkLocation) {
    const [, setIdx, chunkIdx] = location
    const set = sets[setIdx]
    const chunk = set.chunks[chunkIdx]

    set.chunks[chunkIdx] = null

    return chunk
  }

  const tmpReadIndices = []

  function* read(flags: number[], filters: Filter[], out: ComponentsOf<T>) {
    const len = flags.length

    // Calculate the index of each outgoing component.
    for (let i = 0; i < len; i++) {
      tmpReadIndices[i] = layout.indexOf(flags[i])
    }

    for (let i = 0; i < sets.length; i++) {
      const set = sets[i]

      let match = true
      for (let _ = 0; _ < filters.length; _++) {
        if (!filters[_].matchChunkSet(set, archetype)) {
          match = false
          break
        }
      }
      if (!match) continue

      const { chunks } = set

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]

        if (!chunk) {
          continue
        }

        let match = true
        for (let _ = 0; _ < filters.length; _++) {
          if (!filters[_].matchChunk(chunk, archetype)) {
            match = false
            break
          }
        }
        if (!match) continue

        const { components } = chunk

        for (let k = 0; k < len; k++) {
          out[k] = components[tmpReadIndices[k]]
        }

        yield out as ComponentsOf<T>
      }
    }
  }

  function tag(location: ChunkLocation, tag: number) {
    const set = sets[location[1]]
    const chunk = set.chunks[location[2]]

    if (!chunk) {
      return
    }

    // Add tag to chunk set
    set.tag |= tag
    // Add tag to chunk
    chunk.tag |= tag
  }

  function untag(location: ChunkLocation, tag: number) {
    const set = sets[location[1]]
    const { chunks } = set
    const chunk = set.chunks[location[2]]

    // Unset tag at chunk
    chunk.tag &= ~tag

    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i] && chunks[i].tag & tag) {
        return
      }
    }

    // Unset tag at chunk set
    set.tag &= ~tag
  }

  function get(location: ChunkLocation) {
    const [, setIdx, chunkIdx] = location
    return sets[setIdx].chunks[chunkIdx]
  }

  const archetype = {
    sets,
    remove,
    insert,
    filter,
    read,
    tag,
    untag,
    get,
  }

  return archetype
}
