import {
  Component,
  createEntityAdmin,
  CustomMessage,
  encode,
  Entity,
  EntityTag,
  mutableEmpty,
  protocol,
  Signal,
} from "@net-ecs/core"
import { Server } from "@web-udp/server"
import { createServer } from "http"
import { createClientAdmin } from "./client_admin"
import { createPriorityAccumulator } from "./priority_accumulator"
import { NetEcsServerOptions, ServerClient } from "./types"

export function createNetEcsServer<M extends CustomMessage>(
  options: NetEcsServerOptions,
) {
  const server = createServer()
  const udp = new Server({ server })
  const world = createEntityAdmin(options.world)
  const networkedComponentTypes = Object.keys(options.network.priorities)
  const priorities = createPriorityAccumulator(options.network.priorities)
  const signals = {
    clientConnected: new Signal<ServerClient>(),
    clientDisconnected: new Signal<ServerClient>(),
    clientMessageReceived: new Signal<ServerClient, M>(),
    clientConnectionFailed: new Signal<{ error: string }>(),
  }
  const clients = createClientAdmin({
    onClientConnect(client) {
      signals.clientConnected.dispatch(client)
    },
    onClientDisconnect(client) {
      signals.clientDisconnected.dispatch(client)
    },
    onConnectionError(error) {
      signals.clientConnectionFailed.dispatch(error)
    },
    onClientMessage(client, message) {
      const [, , lib] = message

      if (lib) {
        // Handle client library message.
      } else {
        signals.clientMessageReceived.dispatch(client, message as M)
      }
    },
  })

  const temp_created: (Entity | Component)[] = []
  const temp_deleted: Entity[] = []
  const temp_changed_r: Component[] = []
  const temp_changed_u: Component[] = []

  let last_update_u = 0

  world.preTick.subscribe(() => {
    const time = world.clock.time
    let send_u = false
    let send_r = false

    for (let entity of world.entities) {
      switch (world.tags.get(entity)) {
        case EntityTag.Created: {
          const components = world.getAllComponents(entity)
          temp_created.push(entity)

          for (let j = 0; j < components.length; j++) {
            temp_created.push(components[j])
          }
          break
        }
        case EntityTag.Changed:
          for (let j = 0; j < networkedComponentTypes.length; j++) {
            const componentName = networkedComponentTypes[j]
            const config = options.network.priorities[componentName]
            const component = world.tryGetComponentByType(entity, componentName)

            if (!component) {
              continue
            }

            if (config.unreliable) {
              send_u = true
              priorities.update(component)
            } else {
              send_r = true
              temp_changed_r.push(component)
            }
          }
          break
        case EntityTag.Deleted:
          temp_deleted.push(entity)
          break
      }
    }

    send_u =
      send_u && time - last_update_u >= options.network.unreliableSendRate

    if (send_u) {
      for (const update of priorities) {
        temp_changed_u.push(update)

        if (temp_changed_u.length >= options.network.unreliableUpdateSize) {
          break
        }
      }
    }

    priorities.reset()

    for (const client of clients) {
      const clientStateUpdateMetadata = options.getClientStateUpdateMetadata(
        client,
      )

      if (temp_created.length > 0) {
        client.reliable?.send(encode(protocol.entitiesCreated(temp_created)))
      }

      if (temp_deleted.length > 0) {
        client.reliable?.send(encode(protocol.entitiesDeleted(temp_deleted)))
      }

      if (send_r) {
        const message = protocol.stateUpdate(
          temp_changed_r,
          clientStateUpdateMetadata,
        )
        client.reliable?.send(encode(message))
      }

      if (send_u) {
        const message = protocol.stateUpdate(
          temp_changed_u,
          clientStateUpdateMetadata,
        )

        client.unreliable?.send(encode(message))
        last_update_u = time
      }
    }

    mutableEmpty(temp_changed_r)
    mutableEmpty(temp_changed_u)
    mutableEmpty(temp_created)
    mutableEmpty(temp_deleted)
  })

  udp.connections.subscribe(clients.handleConnection)

  return {
    world,
    listen: (port: number) => {
      server.listen(port)
    },
    ...signals,
  }
}
