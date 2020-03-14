import { createComponentFactory } from "@net-ecs/core"

const schema = {
  red: 255,
  green: 0,
  blue: 0,
}

export const Color = createComponentFactory(
  "Color",
  schema,
  (color, red: number = schema.red, green: number = schema.green, blue: number = schema.blue) => {
    color.red = red
    color.green = green
    color.blue = blue
  },
)
