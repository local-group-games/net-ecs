import { createNetEcsClient } from "@net-ecs/client"
import { Entity } from "@net-ecs/core"
import {
  Drone,
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
import { debug } from "./debug"
import { app } from "./graphics"
import {
  colorTransition,
  createExampleServerInfoSystem,
  createInputSystem,
  interpolation,
  reconciliation,
  render,
} from "./systems"

const client = createNetEcsClient({
  url: `ws://${window.location.hostname}:9000`,
  world: {
    componentTypes: [
      // Core
      Transform,
      Drone,
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
})

debug.attach(client.world)

function onEntitiesCreated(entities: Entity[]) {
  debug.log.info(`created entities: ${entities.join(", ")}`)

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    const transform = client.world.tryGetComponent(entity, Transform)

    if (transform) {
      client.world.addComponent(entity, InterpolationBuffer)
      client.world.addComponent(
        entity,
        RenderTransform,
        transform.x,
        transform.y,
      )
    }
  }
}
function onEntitiesDeleted(entities: Entity[]) {
  debug.log.info(`deleted entities: ${entities.join(", ")}`)
}

async function main() {
  ;(window as any).client = client

  const input = createInputSystem(client)
  const exampleServerInfoEntity = client.world.createSingletonComponent(
    ExampleServerInfo,
  )

  client.world.createSingletonComponent(Color)
  client.world.createSingletonComponent(InputBuffer)

  client.world.addSystem(input)
  client.world.addSystem(createExampleServerInfoSystem(client))

  function onMessageReceived(message: ExampleMessage) {
    const serverInfo = client.world.getMutableComponent(
      exampleServerInfoEntity,
      ExampleServerInfo,
    )

    switch (message[0]) {
      case ExampleMessageType.ServerInfo: {
        const { sendRate, tickRate } = message[1]
        debug.log.info(
          `server info: sendRate=${sendRate}, tickRate=${tickRate}`,
        )
        serverInfo.sendRate = sendRate
        serverInfo.tickRate = tickRate
        break
      }
      case ExampleMessageType.ClientEntity: {
        const entity = message[1]
        debug.log.info(`remote client entity: ${entity}`)
        serverInfo.remoteClientEntity = entity
        break
      }
    }
  }

  client.entitiesCreated.subscribe(onEntitiesCreated)
  client.entitiesDeleted.subscribe(onEntitiesDeleted)
  client.messageReceived.subscribe(onMessageReceived)

  app.ticker.add(() => client.world.tick(app.ticker.deltaMS))

  debug.log.info("connecting to master server")
  await client.initialize()
  debug.log.info("connected to master server")
}

main()
