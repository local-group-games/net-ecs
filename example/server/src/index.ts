import { encode } from "@net-ecs/core"
import { createNetEcsServer, ServerClient } from "@net-ecs/server"
import { Drone, Player, Transform } from "./components"
import { applyInput } from "./helpers"
import { ExampleMessage, ExampleMessageType, protocol } from "./protocol"
import { droneMovement } from "./systems"

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
      systems: [droneMovement],
      componentTypes: [Transform, Player, Drone],
    },
    network: {
      priorities: {
        transform: {
          weight: 2,
          unreliable: true,
        },
        drone: {
          weight: 1,
          unreliable: false,
        },
      },
      unreliableSendRate: (1 / SEND_RATE) * 1000,
      unreliableUpdateSize: 100,
    },
    getClientStateUpdateMetadata: client => ({
      seq: inputSequenceByClient.get(client),
    }),
  })

  function onClientConnect(client: ServerClient) {
    const entity = server.world.createEntity()

    server.world.addComponent(entity, Player)
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

    server.world.deleteEntity(entity)
    entitiesByClient.delete(client)
  }

  function onClientMessage(client: ServerClient, message: ExampleMessage) {
    const entity = entitiesByClient.get(client)

    switch (message[0]) {
      case ExampleMessageType.Move:
        const input = message[1]

        if (input[0] || input[1] || input[2] || input[3]) {
          const transform = server.world.getMutableComponent(entity, Transform)
          applyInput(input, transform)
        }

        inputSequenceByClient.set(client, input[4])
        break
    }
  }

  server.clientConnected.subscribe(onClientConnect)
  server.clientDisconnected.subscribe(onClientDisconnect)
  server.clientMessageReceived.subscribe(onClientMessage)

  let previousTime = 0

  function start(port: number) {
    for (let i = 0; i < 1000; i++) {
      const enemy = server.world.createEntity()

      server.world.addComponent(enemy, Drone, Math.random())
      server.world.addComponent(
        enemy,
        Transform,
        Math.random() * 800,
        Math.random() * 600,
      )
    }

    setInterval(() => {
      const time = Date.now()
      server.world.tick(time - previousTime)
      previousTime = time
    }, (1 / TICK_RATE) * 1000)
    server.listen(port)
  }

  return { start }
}
