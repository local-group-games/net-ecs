import { Chunk, ChunkSet } from "./storage_types"

export type Filter = {
  matchChunk(chunk: Chunk): boolean
  matchChunkSet(chunkSet: ChunkSet): boolean
}

export function createChangedFilter(): Filter {
  const prevChunks = new WeakMap<Chunk, number>()
  const prevChunkSets = new WeakMap<ChunkSet, number>()

  function matchChunk(chunk: Chunk) {
    const curr = chunk.version
    const last = prevChunks.get(chunk)
    const match = curr !== last

    if (match) {
      prevChunks.set(chunk, curr)
    }

    return match
  }

  function matchChunkSet(chunkSet: ChunkSet) {
    const curr = chunkSet.version
    const last = prevChunkSets.get(chunkSet)
    const match = curr !== last

    if (match) {
      prevChunkSets.set(chunkSet, curr)
    }

    return match
  }

  return {
    matchChunk,
    matchChunkSet,
  }
}

export const changed = createChangedFilter()
