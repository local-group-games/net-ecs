import { createComponentFactory } from "@net-ecs/core"

export const Velocity = createComponentFactory(
  "Velocity",
  {
    x: 0,
    y: 0,
  },
  (velocity, x: number = velocity.x, y: number = velocity.y) => {
    velocity.x = x
    velocity.y = y
  },
)
