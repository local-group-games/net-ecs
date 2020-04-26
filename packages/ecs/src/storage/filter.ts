import { Chunk, ChunkSet } from "./storage_types"

export type Filter = {
  matchChunk(chunk: Chunk): boolean
  matchChunkSet(chunkSet: ChunkSet): boolean
}

export function tag(tag: number): Filter {
  return {
    matchChunk: (chunk: Chunk) => (tag & chunk.tag) === tag,
    matchChunkSet: (chunkSet: ChunkSet) => (tag & chunkSet.tag) === tag,
  }
}

export function changed(): Filter {
  const prevChunks = new WeakMap<Chunk, number>()
  const prevChunkSets = new WeakMap<ChunkSet, number>()

  function createMatcher<T extends { version: number }>(
    cache: WeakMap<T, number>,
  ) {
    return (t: T) => {
      const curr = t.version
      const last = cache.get(t) || 0
      const hit = curr > last

      if (hit) {
        cache.set(t, curr)
      }

      return hit
    }
  }

  return {
    matchChunk: createMatcher(prevChunks),
    matchChunkSet: createMatcher(prevChunkSets),
  }
}
