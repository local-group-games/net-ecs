import {
  Changed,
  Component,
  createSystem,
  Entity,
  EntityAdmin,
  protocol,
  Removed,
} from "@net-ecs/core"
import { createPriorityAccumulator } from "../priority_accumulator"
import { NetEcsServerClient, NetEcsServerNetworkOptions } from "../types"

export function createNetworkSystem(
  world: EntityAdmin,
  clients: NetEcsServerClient[],
  options: NetEcsServerNetworkOptions,
) {
  const priorityAccumulator = createPriorityAccumulator(world, options.priorities)
  const networkSystem = createSystem(
    "network",
    (world, removed, changed) => {
      sendRemoved(removed)
      sendUpdated(changed)
    },
    [Removed()],
    [Changed()],
  )

  let lastUnreliableUpdateTime = 0

  function sendRemoved(removed: Entity[]) {
    if (removed.length === 0) {
      return
    }

    const packet = protocol.entitiesRemoved(removed)

    for (let i = 0; i < clients.length; i++) {
      clients[i].reliable?.send(packet)
    }
  }

  function sendUpdated(updated: Entity[]) {
    if (updated.length === 0) {
      return
    }

    const time = Date.now()
    const componentsReliable: Component[] = []
    const componentsUnreliable: Component[] = []

    for (const update of priorityAccumulator.update(updated)) {
      const config = options.priorities[update.type]

      if (config) {
        const target = config.unreliable ? componentsUnreliable : componentsReliable

        target.push(update)

        if (target.length >= options.updateSize) {
          break
        }
      }
    }

    const packetReliable =
      componentsReliable.length > 0 ? protocol.stateUpdate(componentsReliable) : null
    const packetUnreliable =
      componentsUnreliable.length > 0 ? protocol.stateUpdate(componentsUnreliable) : null

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i]
      const eligibleForUnreliable = time - lastUnreliableUpdateTime >= options.unreliableSendRate

      if (packetReliable) {
        client.reliable?.send(packetReliable)
      }

      if (packetUnreliable && eligibleForUnreliable) {
        client.unreliable?.send(packetUnreliable)
        lastUnreliableUpdateTime = time
      }
    }
  }

  return networkSystem
}
