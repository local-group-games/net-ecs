import { createComponentType, number } from "@net-ecs/core"

export const Velocity = createComponentType({
  name: "velocity",
  schema: {
    x: number,
    y: number,
  },
  initialize(velocity, x: number = velocity.x, y: number = velocity.y) {
    velocity.x = x
    velocity.y = y
  },
})
