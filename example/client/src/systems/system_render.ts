import { createSystem, With } from "@net-ecs/core"
import { Velocity } from "@net-ecs/example-server"
import Victor from "victor"
import { Color } from "../components"
import { PredictionBuffer } from "../components/component_prediction_buffer"
import { app, framerate, graphics } from "../graphics"

const renderVelocity = new Victor(0, 0)

function fromRGBto32(r: number, g: number, b: number) {
  return Number(
    "0x" +
      ("0" + r.toString(16)).slice(-2) +
      ("0" + g.toString(16)).slice(-2) +
      ("0" + b.toString(16)).slice(-2),
  )
}

export const render = createSystem({
  name: "render",
  query: [[With(Color)], [With(PredictionBuffer), With(Velocity)]],
  execute(world, [color], entities) {
    const { r, g, b } = world.getComponent(color, Color)
    const color32 = fromRGBto32(r, g, b)

    graphics.clear()

    if (world.clock.tick % 60 === 0) {
      framerate.text = `${app.ticker.FPS.toFixed(0)}`
    }

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const velocity = world.getComponent(entity, Velocity)
      const { x, y } = world.getComponent(entity, PredictionBuffer)

      graphics.lineStyle(1, color32)
      graphics.drawCircle(x, y, 4)

      renderVelocity.x = velocity.x
      renderVelocity.y = velocity.y
      renderVelocity.normalize()
      renderVelocity.multiplyScalar(10)

      graphics.lineStyle(1, color32, 1)
      graphics.moveTo(x, y)
      graphics.lineTo(x + renderVelocity.x, y + renderVelocity.y)
    }
  },
})
