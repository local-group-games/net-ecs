import { createComponentType, number, array } from "@net-ecs/core"

export const InterpolationBuffer = createComponentType({
  name: "interpolation_buffer",
  schema: {
    x: number,
    y: number,
    positions: array(array(number)),
  },
  initialize(buffer, x = buffer.x, y = buffer.y) {
    buffer.positions = []
    buffer.x = x
    buffer.y = y
  },
})
