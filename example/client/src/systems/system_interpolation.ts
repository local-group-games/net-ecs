import { Changed, createSystem, With, Created, ComponentsChanged } from "@net-ecs/core"
import { Transform } from "@net-ecs/example-server"
import { InterpolationBuffer } from "../components/component_interpolation_buffer"
import { ClientInfo } from "../components/component_client_info"

const sendRate = 20

export const interpolation = createSystem({
  name: "interpolation",
  query: [
    [With(ClientInfo)],
    // All transforms
    [With(Transform)],
    // Transforms modified by server state update
    [Changed(Transform)],
    // Entities to interpolate
    [With(InterpolationBuffer)],
  ],
  execute(world, [clientInfo], transforms, changedTransforms, buffers) {
    const { localClientEntity } = world.getComponent(clientInfo, ClientInfo)
    const timeMs = world.clock.time * 1000
    const renderTime = timeMs - 1000 / sendRate

    for (let i = 0; i < transforms.length; i++) {
      const entity = transforms[i]
      const transform = world.getComponent(entity, Transform)
      let buffer = world.tryGetMutableComponent(entity, InterpolationBuffer)

      // Create buffers for Transforms without them.
      if (!buffer) {
        const c = world.addComponent(entity, InterpolationBuffer, transform.x, transform.y)

        if (c) {
          buffer = c
        } else {
          continue
        }
      }
    }

    for (let i = 0; i < changedTransforms.length; i++) {
      const entity = changedTransforms[i]
      const transform = world.getComponent(entity, Transform)
      const buffer = world.getMutableComponent(entity, InterpolationBuffer)

      if (entity === localClientEntity) {
        buffer.x = transform.x
        buffer.y = transform.y
      } else {
        // Insert new update into buffer.
        buffer.positions.push([timeMs, transform.x, transform.y])
      }
    }

    for (let i = 0; i < buffers.length; i++) {
      const entity = buffers[i]

      if (entity === localClientEntity) {
        continue
      }

      const buffer = world.getMutableComponent(entity, InterpolationBuffer)
      const { positions: updates } = buffer

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
})
