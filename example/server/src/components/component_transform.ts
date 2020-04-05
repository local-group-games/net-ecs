import { createComponentType, number } from "@net-ecs/core"

export const Transform = createComponentType({
  name: "transform",
  schema: {
    x: number,
    y: number,
  },
  initialize(transform, x: number = transform.x, y: number = transform.y) {
    transform.x = x
    transform.y = y
  },
})
