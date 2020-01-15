import { createSystem, With } from "@net-ecs/core"
import Victor from "victor"
import { Transform, Velocity } from "../components"
import { graphics } from "../graphics"

const v = new Victor(0, 0)

export const renderSystem = createSystem(
  (world, entities) => {
    graphics.clear()
    graphics.lineStyle(1, 0xffffff)

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const velocity = world.getComponent(entity, Velocity)
      const position = world.getComponent(entity, Transform)

      graphics.drawCircle(position.x, position.y, 4)
      v.x = velocity.x
      v.y = velocity.y
      v.normalize()
      v.multiplyScalar(10)
      graphics.lineStyle(1, 0xffffff, 1)
      graphics.moveTo(position.x, position.y)
      graphics.lineTo(position.x + v.x, position.y + v.y)
    }
  },
  [With(Transform), With(Velocity)],
)
