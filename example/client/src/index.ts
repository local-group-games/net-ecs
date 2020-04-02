import { ComponentUpdater, createNetEcsClient } from "@net-ecs/client"
import { ComponentOf } from "@net-ecs/core"
import { mount } from "@net-ecs/debug"
import { Boid, Neighbors, Transform, Velocity } from "@net-ecs/example-server"
import { Color } from "./components"
import { app } from "./graphics"
import { colorTransitionSystem, renderSystem } from "./systems"
import { lerp } from "@gamestdio/mathf"

mount(document.getElementById("ui")!)

const client = createNetEcsClient("ws://localhost:9000", {
  Transform: (local: ComponentOf<typeof Transform>, remote: ComponentOf<typeof Transform>) => {
    local.x = lerp(local.x, remote.x, 0.5)
    local.y = lerp(local.y, remote.y, 0.5)
  },
})

async function main() {
  client.world.registerComponentFactory(Boid)
  client.world.registerComponentFactory(Color)
  client.world.registerComponentFactory(Neighbors)
  client.world.registerComponentFactory(Transform)
  client.world.registerComponentFactory(Velocity)

  client.world.createSingletonComponent(Color)

  client.world.addSystem(renderSystem)
  client.world.addSystem(colorTransitionSystem)

  app.ticker.add(() => client.world.tick(app.ticker.deltaMS / 1000))
  ;(window as any).world = client.world
  await client.initialize()
}

main()
