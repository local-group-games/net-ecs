import { createComponentType, number } from "@net-ecs/core"

export const Color = createComponentType({
  name: "color",
  schema: {
    r: { type: number, defaultValue: 255 },
    g: number,
    b: number,
  },
  initialize(color, r: number = color.r, g: number = color.g, b: number = color.b) {
    color.r = r
    color.g = g
    color.b = b
  },
})
