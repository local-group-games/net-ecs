import { encode } from "@net-ecs/core"
import { createNetEcsServer, ServerClient } from "@net-ecs/server"
import { Transform } from "./components"
import { applyInput } from "./helpers"
import { ExampleMessage, ExampleMessageType, protocol } from "./protocol"

export * from "./components"
export * from "./helpers"
export * from "./protocol"
export * from "./types"

export function createNetEcsExampleServer() {
  const entitiesByClient = new WeakMap<ServerClient, number>()
  const server = createNetEcsServer<ExampleMessage>({
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
    },
  })

  function onClientConnect(client: ServerClient) {
    const entity = server.world.createEntity()

    server.world.addComponent(entity, Transform)
    entitiesByClient.set(client, entity)
    client.reliable.send(encode(protocol.clientEntity(-1, entity)))
  }

  function onClientDisconnect(client: ServerClient) {
    const entity = entitiesByClient.get(client)

    if (!entity) {
      return
    }

    server.world.destroyEntity(entity)
    entitiesByClient.delete(client)
  }

  function onClientMessage(client: ServerClient, message: ExampleMessage) {
    const entity = entitiesByClient.get(client)

    switch (message[0]) {
      case ExampleMessageType.Move:
        const data = message[1]
        const transform = server.world.getMutableComponent(entity, Transform)
        applyInput(data, transform)
        break
    }
  }

  server.clientConnected.subscribe(onClientConnect)
  server.clientDisconnected.subscribe(onClientDisconnect)
  server.clientMessageReceived.subscribe(onClientMessage)

  return server
}
