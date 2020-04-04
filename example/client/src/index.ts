import { createNetEcsClient } from "@net-ecs/client"
import { mount } from "@net-ecs/debug"
import { Boid, Neighbors, Transform, Velocity } from "@net-ecs/example-server"
import { Color } from "./components"
import { app } from "./graphics"
import { colorTransition, render } from "./systems"
import { PositionBuffer } from "./components/component_position_buffer"
import { transformEasing } from "./systems/system_transform_easing"

mount(document.getElementById("ui")!)

const client = createNetEcsClient("ws://localhost:9000", {})

async function main() {
  client.world.registerComponentFactory(Boid)
  client.world.registerComponentFactory(Color)
  client.world.registerComponentFactory(Neighbors)
  client.world.registerComponentFactory(Transform)
  client.world.registerComponentFactory(Velocity)
  client.world.registerComponentFactory(PositionBuffer)

  client.world.createSingletonComponent(Color)

  client.world.addSystem(render)
  client.world.addSystem(colorTransition)
  client.world.addSystem(transformEasing)

  app.ticker.add(() => client.world.tick(app.ticker.deltaMS / 1000))
  ;(window as any).world = client.world

  await client.initialize()
}

main()
