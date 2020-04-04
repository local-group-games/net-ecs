import { createSystem, With } from "@net-ecs/core"
import { Velocity } from "@net-ecs/example-server"
import Victor from "victor"
import { Color } from "../components"
import { PredictionBuffer } from "../components/component_prediction_buffer"
import { app, framerate, graphics } from "../graphics"

const renderVelocity = new Victor(0, 0)

function fromRGBto32(red: number, green: number, blue: number) {
  return Number(
    "0x" +
      ("0" + red.toString(16)).slice(-2) +
      ("0" + green.toString(16)).slice(-2) +
      ("0" + blue.toString(16)).slice(-2),
  )
}

export const render = createSystem(
  "render",
  (world, [color], entities) => {
    const { red, green, blue } = world.getComponent(color, Color)
    const color32 = fromRGBto32(red, green, blue)

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
  [With(Color)],
  [With(PredictionBuffer), With(Velocity)],
)
