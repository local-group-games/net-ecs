import { createNetEcsClient } from "@net-ecs/client"
import { createSystem, Entity, With } from "@net-ecs/core"
import { mount } from "@net-ecs/debug"
import {
  ExampleMessage,
  ExampleMessageType,
  Transform,
} from "@net-ecs/example-server"
import { Color, InterpolationBuffer } from "./components"
import { ClientInfo } from "./components/component_client_info"
import { InputBuffer } from "./components/component_input_buffer"
import { RenderTransform } from "./components/component_render_transform"
import { app } from "./graphics"
import {
  colorTransition,
  createInputSystem,
  interpolation,
  render,
} from "./systems"
import { reconciliation } from "./systems/system_reconciliation"

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
      RenderTransform,
    ],
    systems: [
      // Client
      reconciliation,
      colorTransition,
      interpolation,
      render,
    ],
  },
  network: {
    onEntitiesCreated(entities, client) {
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i]
        const transform = client.world.tryGetComponent(entity, Transform)

        if (transform) {
          client.world.addComponent(entity, InterpolationBuffer)
          client.world.addComponent(entity, RenderTransform)
        }
      }
    },
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
      remoteClientEntity !== clientInfo.remoteClientEntity
    ) {
      const local = client.remoteToLocal.get(remoteClientEntity)!

      if (local) {
        clientInfo.remoteClientEntity = remoteClientEntity
        clientInfo.localClientEntity = local
      }
    }
  },
})

async function main() {
  const input = createInputSystem(client)

  client.world.createSingletonComponent(ClientInfo)
  client.world.createSingletonComponent(InputBuffer)

  client.world.addSystem(input)
  client.world.addSystem(clientInfo)
  client.world.createSingletonComponent(Color)

  app.ticker.add(() => client.world.tick(app.ticker.deltaMS / 1000))
  ;(window as any).world = client.world

  await client.initialize()
}

main()
