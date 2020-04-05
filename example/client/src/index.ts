import { createNetEcsClient } from "@net-ecs/client"
import { mount } from "@net-ecs/debug"
import { Boid, Neighbors, Transform, Velocity } from "@net-ecs/example-server"
import { Color } from "./components"
import { PredictionBuffer } from "./components/component_prediction_buffer"
import { app } from "./graphics"
import { colorTransition, render } from "./systems"
import { prediction } from "./systems/system_prediction"

mount(document.getElementById("ui")!)

const client = createNetEcsClient({
  url: "ws://localhost:9000",
  world: {
    componentTypes: [Boid, Color, Neighbors, Transform, Velocity, PredictionBuffer],
    systems: [render, colorTransition, prediction],
  },
})

async function main() {
  client.world.createSingletonComponent(Color)

  app.ticker.add(() => client.world.tick(app.ticker.deltaMS / 1000))
  ;(window as any).world = client.world

  await client.initialize()
}

main()
