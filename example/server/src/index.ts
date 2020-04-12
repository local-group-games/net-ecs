import { encode } from "@net-ecs/core"
import { createNetEcsServer, ServerClient } from "@net-ecs/server"
import { Transform } from "./components"
import { applyInput } from "./helpers"
import { ExampleMessage, ExampleMessageType, protocol } from "./protocol"

export * from "./components"
export * from "./helpers"
export * from "./protocol"
export * from "./types"

const TICK_RATE = 60
const SEND_RATE = 20

export function createNetEcsExampleServer() {
  const entitiesByClient = new WeakMap<ServerClient, number>()
  const inputSequenceByClient = new WeakMap<ServerClient, number>()
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
      unreliableSendRate: (1 / SEND_RATE) * 1000,
      unreliableUpdateSize: 1000,
    },
    getClientStateUpdateMetadata: client => ({
      seq: inputSequenceByClient.get(client),
    }),
  })

  function onClientConnect(client: ServerClient) {
    const entity = server.world.createEntity()

    server.world.addComponent(entity, Transform)
    entitiesByClient.set(client, entity)
    client.reliable.send(encode(protocol.clientEntity(entity)))
    client.reliable.send(encode(protocol.serverInfo(TICK_RATE, SEND_RATE)))
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
        const input = message[1]
        const transform = server.world.getMutableComponent(entity, Transform)
        applyInput(input, transform)
        inputSequenceByClient.set(client, input[4])
        break
    }
  }

  server.clientConnected.subscribe(onClientConnect)
  server.clientDisconnected.subscribe(onClientDisconnect)
  server.clientMessageReceived.subscribe(onClientMessage)

  let previousTime = 0

  function start(port: number) {
    setInterval(() => {
      const time = Date.now()
      server.world.tick(time - previousTime)
      previousTime = time
    }, (1 / TICK_RATE) * 1000)
    server.listen(port)
  }

  return { start }
}
