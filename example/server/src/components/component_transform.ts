import { createComponentFactory } from "@net-ecs/core"

const schema = {
  x: 0,
  y: 0,
}

export const Transform = createComponentFactory(
  "transform",
  schema,
  (transform, x: number = transform.x, y: number = transform.y) => {
    transform.x = x
    transform.y = y
  },
)
