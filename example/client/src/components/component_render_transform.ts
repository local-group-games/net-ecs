import { createComponentType, number } from "@net-ecs/core"

export const RenderTransform = createComponentType({
  name: "render_transform",
  schema: {
    x: number,
    y: number,
  },
  initialize(c, x: number, y: number) {
    c.x = x
    c.y = y
  },
})
