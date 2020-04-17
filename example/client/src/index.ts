import { createNetEcsClient } from "@net-ecs/client"
import { createSystem, Entity, With } from "@net-ecs/core"
import {
  ExampleMessage,
  ExampleMessageType,
  Transform,
} from "@net-ecs/example-server"
import {
  Color,
  ExampleServerInfo,
  InputBuffer,
  InterpolationBuffer,
  RenderTransform,
} from "./components"
import { app } from "./graphics"
import {
  colorTransition,
  createInputSystem,
  interpolation,
  reconciliation,
  render,
} from "./systems"
import { debug } from "./debug"

const client = createNetEcsClient({
  url: `ws://${window.location.hostname}:9000`,
  world: {
    componentTypes: [
      // Core
      Transform,
      // Client
      ExampleServerInfo,
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
      debug.log.info(`created entities: ${entities.join(", ")}`)
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i]
        const transform = client.world.tryGetComponent(entity, Transform)

        if (transform) {
          client.world.addComponent(entity, InterpolationBuffer)
          client.world.addComponent(entity, RenderTransform)
        }
      }
    },
    onEntitiesDeleted(entities) {
      debug.log.info(`deleted entities: ${entities.join(", ")}`)
    },
    onStateUpdate() {
      // debug.log.info("update", { id: "state_update", duration: 10000 })
    },
    onServerMessage(message: ExampleMessage) {
      switch (message[0]) {
        case ExampleMessageType.ServerInfo:
          debug.log.info(
            `server info: sendRate=${message[1].sendRate}, tickRate=${message[1].tickRate}`,
          )
          serverInfo = message[1]
          break
        case ExampleMessageType.ClientEntity:
          debug.log.info(`client entity: ${message[1]}`)
          remoteClientEntity = message[1]
          break
      }
    },
  },
})

debug.attach(client.world)

let serverInfo: { sendRate: number; tickRate: number } | null = null
let remoteClientEntity: Entity | null = null

const exampleServerInfo = createSystem({
  name: "example_server_info",
  query: [[With(ExampleServerInfo)]],
  execute(world, [entity]) {
    const exampleServerInfo = world.getMutableComponent(
      entity,
      ExampleServerInfo,
    )

    if (serverInfo && !exampleServerInfo.tickRate) {
      Object.assign(exampleServerInfo, serverInfo)
    }

    if (
      remoteClientEntity &&
      remoteClientEntity !== exampleServerInfo.remoteClientEntity
    ) {
      const local = client.remoteToLocal.get(remoteClientEntity)!

      if (local) {
        exampleServerInfo.remoteClientEntity = remoteClientEntity
        exampleServerInfo.localClientEntity = local
      }
    }
  },
})

async function main() {
  const input = createInputSystem(client)

  client.world.createSingletonComponent(ExampleServerInfo)
  client.world.createSingletonComponent(InputBuffer)

  client.world.addSystem(input)
  client.world.addSystem(exampleServerInfo)
  client.world.createSingletonComponent(Color)

  app.ticker.add(() => client.world.tick(app.ticker.deltaMS))
  ;(window as any).world = client.world

  debug.log.info("connecting to master server")
  await client.initialize()
  debug.log.info("connected to master server")
}

main()
