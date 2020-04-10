import { createComponentType, number, array } from "@net-ecs/core"

export const InterpolationBuffer = createComponentType({
  name: "interpolation_buffer",
  schema: {
    positions: array(array(number)),
  },
  initialize(buffer) {
    buffer.positions = []
  },
})
