import { Changed, createSystem, With } from "@net-ecs/core"
import { Transform } from "@net-ecs/example-server"
import { PredictionBuffer } from "../components/component_prediction_buffer"

const sendRate = 20

export const prediction = createSystem(
  "prediction",
  (world, transforms, buffers) => {
    const timeMs = world.clock.time * 1000
    const renderTime = timeMs - 1000 / sendRate

    for (let i = 0; i < transforms.length; i++) {
      const entity = transforms[i]
      const transform = world.getComponent(entity, Transform)

      let buffer = world.tryGetMutableComponent(entity, PredictionBuffer)

      // Create buffers for Transforms without them.
      if (!buffer) {
        const b = world.addComponent(entity, PredictionBuffer, transform.x, transform.y)

        if (b) {
          buffer = b
        } else {
          continue
        }
      }

      // Insert new update into buffer.
      buffer.updates.push([timeMs, transform.x, transform.y])
    }

    for (let i = 0; i < buffers.length; i++) {
      const entity = buffers[i]
      const buffer = world.getMutableComponent(entity, PredictionBuffer)
      const { updates } = buffer

      // Drop older positions.
      while (updates.length >= 2 && updates[1][0] <= renderTime) {
        updates.shift()
      }

      if (updates.length >= 2 && updates[0][0] <= renderTime && renderTime <= updates[1][0]) {
        const [[t0, x0, y0], [t1, x1, y1]] = updates

        // Interpolate position.
        buffer.x = x0 + ((x1 - x0) * (renderTime - t0)) / (t1 - t0)
        buffer.y = y0 + ((y1 - y0) * (renderTime - t0)) / (t1 - t0)
      }
    }
  },
  [Changed(Transform)],
  [With(PredictionBuffer)],
)
