import { ComponentsOfTypes, ComponentType } from "../component"
import { mutableRemoveUnordered } from "../util/array"
import { Archetype, Chunk, ChunkLocation, ChunkSet } from "./storage_types"
import { Filter } from "./filter"

function createChunkSet<T extends ComponentType[]>(): ChunkSet<T> {
  return {
    tag: 0,
    version: 1,
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

  function insert(components: ComponentsOfTypes<T>): ChunkLocation {
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

    const chunk: Chunk<T> = {
      tag: 0,
      version: 1,
      components,
    }
    const chunkIdx = set.chunks.push(chunk) - 1

    return [filter, setIdx, chunkIdx]
  }

  function remove(location: ChunkLocation) {
    const [, setIdx, chunkIdx] = location
    const set = sets[setIdx]
    const chunk = set.chunks[chunkIdx]

    mutableRemoveUnordered(set.chunks, chunk)

    return chunk
  }

  const tmp_read_indices = []

  function* read(
    outFlags: number[],
    out: ComponentsOfTypes<T>,
    tag: number = 0,
    filters?: Filter[],
  ) {
    const len = outFlags.length

    // Calculate the index of each outgoing component.
    for (let i = 0; i < len; i++) {
      tmp_read_indices[i] = outFlags.indexOf(layout[i])
    }

    for (let i = 0; i < sets.length; i++) {
      const set = sets[i]

      if (tag && !((tag & set.tag) === tag)) continue
      if (filters && !filters.every(f => f.matchChunkSet(set))) continue

      const { chunks } = set

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]

        if (tag && !((tag & chunk.tag) === tag)) continue
        if (filters && !filters.every(f => f.matchChunk(chunk))) continue

        const { components } = chunk

        for (let k = 0; k < len; k++) {
          out[tmp_read_indices[k]] = components[k]
        }

        yield out as ComponentsOfTypes<T>
      }
    }
  }

  function bump(location: ChunkLocation) {
    const set = sets[location[1]]
    const chunk = set.chunks[location[2]]

    set.version += 1
    chunk.version += 1
  }

  function tag(location: ChunkLocation, tag: number) {
    const set = sets[location[1]]
    const chunk = set.chunks[location[2]]

    // Add tag to chunk set
    set.tag |= tag
    // Add tag to chunk
    chunk.tag |= tag
  }

  function untag(location: ChunkLocation, tag: number) {
    const set = sets[location[1]]
    const chunk = set.chunks[location[2]]

    // Unset tag at set if no other chunks have tag
    if (!set.chunks.some(c => tag & c.tag)) {
      set.tag &= ~tag
    }

    // Unset tag at chunk
    chunk.tag &= ~tag
  }

  return {
    remove,
    insert,
    filter,
    read,
    tag,
    untag,
    bump,
  }
}
