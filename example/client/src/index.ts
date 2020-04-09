import { createNetEcsClient } from "@net-ecs/client"
import { createSystem, Entity, With } from "@net-ecs/core"
import { mount } from "@net-ecs/debug"
import { ExampleMessage, ExampleMessageType, Transform } from "@net-ecs/example-server"
import { Color, InterpolationBuffer } from "./components"
import { ClientInfo } from "./components/component_client_info"
import { app } from "./graphics"
import { colorTransition, createInputSystem, interpolation, render } from "./systems"
import { reconciliation } from "./systems/system_reconciliation"
import { InputBuffer } from "./components/component_input_buffer"

mount(document.getElementById("ui")!)

let remoteClientEntity: Entity | null = null

const client = createNetEcsClient({
  url: "ws://localhost:9000",
  world: {
    componentTypes: [
      // Core
      Transform,
      // Client
      ClientInfo,
      Color,
      InterpolationBuffer,
      InputBuffer,
    ],
    systems: [
      // Client
      reconciliation,
      render,
      colorTransition,
      interpolation,
    ],
  },
  network: {
    onServerMessage(message: ExampleMessage) {
      switch (message[0]) {
        case ExampleMessageType.ClientEntity:
          remoteClientEntity = message[1]
          break
      }
    },
  },
})

const clientInfo = createSystem({
  name: "client_info",
  query: [[With(ClientInfo)]],
  execute(world, [entity]) {
    const clientInfo = world.getMutableComponent(entity, ClientInfo)

    if (
      remoteClientEntity &&
      remoteClientEntity !== clientInfo.remoteClientEntity &&
      client.remoteToLocal.get(remoteClientEntity)
    ) {
      clientInfo.remoteClientEntity = remoteClientEntity
      clientInfo.localClientEntity = client.remoteToLocal.get(remoteClientEntity)!
    }

    clientInfo.lastFrameProcessedByServer = client.lastFrameProcessedByServer
  },
})

async function main() {
  const input = createInputSystem(client)

  client.world.addSystem(input)
  client.world.addSystem(clientInfo)
  client.world.createSingletonComponent(ClientInfo)
  client.world.createSingletonComponent(Color)
  client.world.createSingletonComponent(InputBuffer)

  app.ticker.add(() => client.world.tick(app.ticker.deltaMS / 1000))
  ;(window as any).world = client.world

  await client.initialize()
}

main()
