import { Component, ComponentType } from "../component"
import { Archetype, Chunk, ChunkSet, Storage } from "./storage_types"

export type Filter = {
  bind(storage: Storage): void
  matchChunk(chunk: Chunk, archetype: Archetype): boolean
  matchChunkSet(chunkSet: ChunkSet, archetype: Archetype): boolean
}

export function tag(tag: number): Filter {
  let _storage: Storage

  return {
    bind(storage) {
      _storage = storage
    },
    matchChunk: (chunk: Chunk) => (tag & chunk.tag) === tag,
    matchChunkSet: (chunkSet: ChunkSet) => (tag & chunkSet.tag) === tag,
  }
}

export function changed(...componentTypes: ComponentType[]): Filter {
  const check = componentTypes.length > 0
  const names = componentTypes.map(t => t.name)
  const cache = new WeakMap<Component, number>()
  let _storage: Storage

  return {
    bind(storage) {
      _storage = storage
    },
    matchChunkSet() {
      return true
    },
    matchChunk(chunk: Chunk) {
      let result = true

      for (let i = 0; i < chunk.components.length; i++) {
        const c = chunk.components[i]

        if (check && !names.includes(c.name)) {
          continue
        }

        const curr = _storage.getVersion(c)
        const last = cache.get(c) || 0
        const hit = curr > last

        if (hit) {
          cache.set(c, curr)
        }

        result = result && hit
      }

      return result
    },
  }
}

export function added(...componentTypes: ComponentType[]): Filter {
  const check = componentTypes.length > 0
  const names = componentTypes.map(t => t.name)
  const cache = new WeakSet<Component>()

  return {
    bind() {},
    matchChunkSet() {
      return true
    },
    matchChunk(chunk: Chunk) {
      let result = true

      for (let i = 0; i < chunk.components.length; i++) {
        const c = chunk.components[i]

        if (check && !names.includes(c.name)) {
          continue
        }

        const hit = !cache.has(c)

        if (hit) {
          cache.add(c)
        }

        result = result && hit
      }

      return result
    },
  }
}
