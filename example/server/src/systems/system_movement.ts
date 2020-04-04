import { createSystem, With } from "@net-ecs/core"
import { Transform, Velocity } from "../components"

const SPEED = 0.1

export const movement = createSystem(
  "movement",
  (world, entities) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const position = world.getMutableComponent(entity, Transform)
      const velocity = world.getComponent(entity, Velocity)

      position.x += velocity.x * world.clock.step * SPEED
      position.y += velocity.y * world.clock.step * SPEED

      if (position.x < 0) {
        position.x = position.x + 800
      } else if (position.x > 800) {
        position.x = position.x - 800
      }
      if (position.y < 0) {
        position.y = position.y + 600
      } else if (position.y > 600) {
        position.y = position.y - 600
      }
    }
  },
  [With(Transform), With(Velocity)],
)
