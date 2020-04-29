import { changed } from "./filter"
import { Chunk, ChunkSet } from "./storage_types"

describe("changed", () => {
  it("matches on changed chunks", () => {
    const filter = changed()
    const chunk: Chunk = {
      components: [],
      version: 1,
      tag: 1,
    }

    expect(filter.matchChunk(chunk)).toBe(true)
    expect(filter.matchChunk(chunk)).toBe(false)
  })
  it("matches on changed chunk sets", () => {
    const filter = changed()
    const chunkSet: ChunkSet = {
      chunks: [],
      version: 1,
      tag: 1,
    }

    expect(filter.matchChunkSet(chunkSet)).toBe(true)
    expect(filter.matchChunkSet(chunkSet)).toBe(false)
  })
})