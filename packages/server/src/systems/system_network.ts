import {
  Changed,
  Component,
  createSystem,
  Entity,
  EntityAdmin,
  protocol,
  Destroyed,
  mutableEmpty,
  Created,
} from "@net-ecs/core"
import { createPriorityAccumulator } from "../priority_accumulator"
import { NetEcsServerClient, NetEcsServerNetworkOptions } from "../types"
import { NetEcsClientAdmin } from "../client_admin"

export function createNetworkSystem(
  world: EntityAdmin,
  clients: NetEcsClientAdmin,
  options: NetEcsServerNetworkOptions,
) {
  const networkedComponentTypes = Object.keys(options.priorities)
  const priorityAccumulator = createPriorityAccumulator(options.priorities)
  const network = createSystem(
    "network",
    (world, created, changed, destroyed) => {
      for (const client of clients) {
        if (!client.initialized && client.reliable) {
          client.initialized = true
          client.reliable.send(protocol.entitiesCreated(world.entities))
        }
      }

      sendCreated(created)
      sendChanged(changed)
      sendDestroyed(destroyed)
    },
    [Created()],
    [Changed()],
    [Destroyed()],
  )
  const updateReliable: Component[] = []
  const updateUnreliable: Component[] = []

  let lastUnreliableUpdateTime = 0

  function sendCreated(created: Entity[]) {
    if (created.length === 0) {
      return
    }

    const packet = protocol.entitiesCreated(created)

    for (const client of clients) {
      client.reliable?.send(packet)
    }
  }

  function sendDestroyed(destroyed: Entity[]) {
    if (destroyed.length === 0) {
      return
    }

    const packet = protocol.entitiesDestroyed(destroyed)

    for (const client of clients) {
      client.reliable?.send(packet)
    }
  }

  function sendChanged(updated: Entity[]) {
    // No-op if no entities were updated this tick.
    if (updated.length === 0) {
      return
    }

    const time = Date.now()

    for (let i = 0; i < updated.length; i++) {
      const entity = updated[i]

      for (let j = 0; j < networkedComponentTypes.length; j++) {
        const componentType = networkedComponentTypes[j]
        const config = options.priorities[componentType]
        const component = world.getComponentByType(entity, componentType)

        if (!world.isChangedComponent(component)) {
          continue
        }

        if (config.unreliable) {
          priorityAccumulator.update(component)
        } else {
          updateReliable.push(component)
        }
      }
    }
    const eligibleForUnreliable = time - lastUnreliableUpdateTime >= options.unreliableSendRate

    if (eligibleForUnreliable) {
      for (const update of priorityAccumulator) {
        updateUnreliable.push(update)

        if (updateUnreliable.length >= options.updateSize) {
          break
        }
      }
    }

    priorityAccumulator.reset()

    const packetReliable = updateReliable.length ? protocol.stateUpdate(updateReliable) : null
    const packetUnreliable = updateUnreliable.length ? protocol.stateUpdate(updateUnreliable) : null

    for (const client of clients) {
      if (packetReliable) {
        client.reliable?.send(packetReliable)
      }

      if (packetUnreliable && eligibleForUnreliable) {
        client.unreliable?.send(packetUnreliable)
        lastUnreliableUpdateTime = time
      }
    }

    mutableEmpty(updateReliable)
    mutableEmpty(updateUnreliable)
  }

  return network
}
