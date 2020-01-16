import { createSystem, With } from "@net-ecs/core"
import Victor from "victor"
import { Color, Transform, Velocity } from "../components"
import { app, entityCount, fps, graphics } from "../graphics"

const renderVelocity = new Victor(0, 0)

function fromRGBto32(red: number, green: number, blue: number) {
  return Number(
    "0x" +
      ("0" + red.toString(16)).slice(-2) +
      ("0" + green.toString(16)).slice(-2) +
      ("0" + blue.toString(16)).slice(-2),
  )
}

export const renderSystem = createSystem(
  (world, entities) => {
    graphics.clear()

    entityCount.text = `${entities.length}`

    if (world.clock.tick % 60 === 0) {
      fps.text = `${app.ticker.FPS.toFixed(0)}`
    }

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const velocity = world.getComponent(entity, Velocity)
      const position = world.getComponent(entity, Transform)
      const { red, green, blue } = world.getComponent(entities[0], Color)
      const color = fromRGBto32(red, green, blue)

      graphics.lineStyle(1, color)
      graphics.drawCircle(position.x, position.y, 4)

      renderVelocity.x = velocity.x
      renderVelocity.y = velocity.y
      renderVelocity.normalize()
      renderVelocity.multiplyScalar(10)

      graphics.lineStyle(1, color, 1)
      graphics.moveTo(position.x, position.y)
      graphics.lineTo(
        position.x + renderVelocity.x,
        position.y + renderVelocity.y,
      )
    }
  },
  [With(Transform), With(Velocity), With(Color)],
)
