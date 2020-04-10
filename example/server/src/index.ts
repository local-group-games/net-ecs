import { encode } from "@net-ecs/core"
import { createNetEcsServer, NetEcsServerClient } from "@net-ecs/server"
import { Transform } from "./components"
import { applyInput } from "./helpers"
import { ExampleMessage, ExampleMessageType, protocol } from "./protocol"

export * from "./components"
export * from "./helpers"
export * from "./protocol"
export * from "./types"

export function createNetEcsExampleServer() {
  const entitiesByClient = new WeakMap<NetEcsServerClient, number>()
  const server = createNetEcsServer({
    world: {
      systems: [],
      componentTypes: [Transform],
    },
    network: {
      priorities: {
        transform: {
          weight: 1,
          unreliable: true,
        },
      },
      unreliableSendRate: (1 / 1) * 1000,
      unreliableUpdateSize: 1000,
      onClientConnect(client, world) {
        const entity = world.createEntity()

        world.addComponent(entity, Transform)
        entitiesByClient.set(client, entity)
        client.reliable.send(encode(protocol.clientEntity(-1, entity)))
      },
      onClientDisconnect(client, world) {
        const entity = entitiesByClient.get(client)

        if (!entity) {
          return
        }

        world.destroyEntity(entity)
        entitiesByClient.delete(client)
      },
      onClientMessage(message: ExampleMessage, client, world) {
        const entity = entitiesByClient.get(client)

        switch (message[0]) {
          case ExampleMessageType.Move:
            const data = message[1]
            const transform = world.getMutableComponent(entity, Transform)
            applyInput(data, transform)
            break
        }
      },
    },
  })

  return server
}
