import { createComponentType, number, array } from "@net-ecs/core"

export const PredictionBuffer = createComponentType({
  name: "prediction_buffer",
  schema: {
    x: number,
    y: number,
    updates: array(array(number)),
  },
  initialize(buffer, x = buffer.x, y = buffer.y) {
    buffer.updates = []
    buffer.x = x
    buffer.y = y
  },
})
