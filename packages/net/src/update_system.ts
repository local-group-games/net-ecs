import { Storage, query, ComponentType, ChunkSet, Chunk } from "@net-ecs/ecs"
import { createPriorityAccumulator } from "./priority_accumulator"

type NetworkComponentConfig = {
  componentType: ComponentType
  reliable: boolean
  priority: number
}

type NetworkSyncConfig = {
  components: NetworkComponentConfig[]
}

export function updater(config: NetworkSyncConfig) {
  const priorities = config.components.reduce((a, c) => {
    a[c.componentType.name] = c.priority
    return a
  }, {})
  const priorityAccumulator = createPriorityAccumulator(priorities)
  const componentsReliable = config.components
    .filter(c => c.reliable)
    .map(c => c.componentType)
  const componentsUnreliable = config.components.map(c => c.componentType)
  const queryReliable = query(...componentsReliable)
  const queryUnreliable = query(...componentsUnreliable)

  function* unreliable(storage: Storage) {
    for (const components of queryUnreliable.run(storage)) {
      // Use length of networked component types since the length of the query
      // result is not guaranteed to be the same
      for (let i = 0; i < componentsUnreliable.length; i++) {
        priorityAccumulator.update(components[i])
      }
    }

    yield* priorityAccumulator
  }

  function* reliable(storage: Storage) {
    for (const components of queryReliable.run(storage)) {
      for (let i = 0; i < componentsReliable.length; i++) {
        yield components[i]
      }
    }
  }

  return { unreliable, reliable }
}
