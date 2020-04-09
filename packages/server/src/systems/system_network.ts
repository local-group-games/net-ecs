import {
  Changed,
  CustomMessage,
  Component,
  Created,
  createSystem,
  Destroyed,
  encode,
  Entity,
  EntityAdmin,
  mutableEmpty,
  noop,
  protocol,
} from "@net-ecs/core"
import { NetEcsClientAdmin } from "../client_admin"
import { createPriorityAccumulator } from "../priority_accumulator"
import { NetEcsServerNetworkOptions, NetEcsServerClient } from "../types"

export function createNetworkSystem(
  world: EntityAdmin,
  clients: NetEcsClientAdmin,
  options: NetEcsServerNetworkOptions,
) {
  const { onClientMessage = noop } = options
  const networkedComponentTypes = Object.keys(options.priorities)
  const priorityAccumulator = createPriorityAccumulator(options.priorities)
  const lastTicks = new WeakMap<NetEcsServerClient, number>()
  const network = createSystem({
    name: "network",
    query: [[Created()], [Changed()], [Destroyed()]],
    execute(world, created, changed, destroyed) {
      for (const client of clients) {
        if (!client.initialized && client.reliable) {
          client.initialized = true
          client.reliable.send(encode(protocol.entitiesCreated(-1, world.entities)))
        }

        // Process client messages.
        for (const message of clients.messages(client)) {
          const [, , lib, tick] = message

          lastTicks.set(client, tick)

          if (lib) {
            // Handle client library message.
          } else {
            onClientMessage(message as CustomMessage, client, world)
          }
        }
      }

      sendCreated(created)
      sendChanged(changed)
      sendDestroyed(destroyed)
    },
  })
  const updateReliable: Component[] = []
  const updateUnreliable: Component[] = []

  let lastUnreliableUpdateTime = 0

  function sendCreated(created: Entity[]) {
    if (created.length === 0) {
      return
    }

    for (const client of clients) {
      const tick = lastTicks.get(client)
      const message = protocol.entitiesCreated(tick, created)

      client.reliable?.send(encode(message))
    }
  }

  function sendDestroyed(destroyed: Entity[]) {
    if (destroyed.length === 0) {
      return
    }

    for (const client of clients) {
      const tick = lastTicks.get(client)
      const message = protocol.entitiesDestroyed(tick, destroyed)

      client.reliable?.send(encode(message))
    }
  }

  function sendChanged(updated: Entity[]) {
    // No-op if no entities were updated this tick.
    if (updated.length === 0) {
      return
    }

    const time = Date.now()

    let sendReliable = false
    let sendUnreliable = false

    for (let i = 0; i < updated.length; i++) {
      const entity = updated[i]

      for (let j = 0; j < networkedComponentTypes.length; j++) {
        const componentName = networkedComponentTypes[j]
        const config = options.priorities[componentName]
        const component = world.getComponentByType(entity, componentName)

        if (!world.isChangedComponent(component)) {
          continue
        }

        if (config.unreliable) {
          sendUnreliable = true
          priorityAccumulator.update(component)
        } else {
          sendReliable = true
          updateReliable.push(component)
        }
      }
    }
    const eligibleForUnreliable = time - lastUnreliableUpdateTime >= options.unreliableSendRate

    if (eligibleForUnreliable) {
      for (const update of priorityAccumulator) {
        updateUnreliable.push(update)

        if (updateUnreliable.length >= options.unreliableUpdateSize) {
          break
        }
      }
    }

    priorityAccumulator.reset()

    for (const client of clients) {
      const tick = lastTicks.get(client)

      if (sendReliable) {
        const message = protocol.stateUpdate(tick, updateReliable)

        client.reliable?.send(encode(message))
      }

      if (sendUnreliable && eligibleForUnreliable) {
        const message = protocol.stateUpdate(tick, updateUnreliable)

        client.unreliable?.send(encode(message))
        lastUnreliableUpdateTime = time
      }
    }

    mutableEmpty(updateReliable)
    mutableEmpty(updateUnreliable)
  }

  return network
}
