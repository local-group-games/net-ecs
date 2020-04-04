import { createComponentFactory } from "@net-ecs/core"

const schema = {
  x: 0,
  y: 0,
  updates: [] as [number, number, number][],
}

export const PredictionBuffer = createComponentFactory(
  "position_buffer",
  schema,
  (buffer, x = buffer.x, y = buffer.y) => {
    buffer.updates = []
    buffer.x = x
    buffer.y = y
  },
)
