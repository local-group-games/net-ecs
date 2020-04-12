import { Changed, createSystem, With } from "@net-ecs/core"
import { Transform } from "@net-ecs/example-server"
import { ExampleServerInfo } from "../components/component_example_server_info"
import { InterpolationBuffer } from "../components/component_interpolation_buffer"
import { RenderTransform } from "../components/component_render_transform"

export const interpolation = createSystem({
  name: "interpolation",
  query: [
    [With(ExampleServerInfo)],
    // Transforms modified by server state update
    [Changed(Transform)],
    // Entities to interpolate
    [With(InterpolationBuffer)],
  ],
  execute(world, [clientInfo], transforms, buffers) {
    const { time } = world.clock
    const { localClientEntity, sendRate } = world.getComponent(
      clientInfo,
      ExampleServerInfo,
    )
    const renderTime = time - 1000 / sendRate

    for (let i = 0; i < transforms.length; i++) {
      const entity = transforms[i]
      const transform = world.getComponent(entity, Transform)
      const buffer = world.getMutableComponent(entity, InterpolationBuffer)
      const renderTransform = world.getMutableComponent(entity, RenderTransform)

      if (entity === localClientEntity) {
        renderTransform.x = transform.x
        renderTransform.y = transform.y
      } else {
        // Insert new update into buffer.
        buffer.positions.push([time, transform.x, transform.y])
      }
    }

    for (let i = 0; i < buffers.length; i++) {
      const entity = buffers[i]

      if (entity === localClientEntity) {
        continue
      }

      const renderTransform = world.getMutableComponent(entity, RenderTransform)
      const buffer = world.getMutableComponent(entity, InterpolationBuffer)
      const { positions: updates } = buffer

      // Drop older positions.
      while (updates.length >= 2 && updates[1][0] <= renderTime) {
        updates.shift()
      }

      if (
        updates.length >= 2 &&
        updates[0][0] <= renderTime &&
        renderTime <= updates[1][0]
      ) {
        const [[t0, x0, y0], [t1, x1, y1]] = updates

        // Interpolate position.
        renderTransform.x = x0 + ((x1 - x0) * (renderTime - t0)) / (t1 - t0)
        renderTransform.y = y0 + ((y1 - y0) * (renderTime - t0)) / (t1 - t0)
      }
    }
  },
})
