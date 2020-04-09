import { createSystem, With, Changed } from "@net-ecs/core"
import { InterpolationBuffer } from "../components"
import { ClientInfo } from "../components/component_client_info"
import { InputBuffer } from "../components/component_input_buffer"
import { Transform, applyInput, InputData } from "@net-ecs/example-server"

export const reconciliation = createSystem({
  name: "reconciliation",
  query: [[With(ClientInfo)], [With(InputBuffer)], [Changed(Transform)]],
  execute(world, [clientInfo], [inputBuffer], updatedTransforms) {
    const { localClientEntity, lastFrameProcessedByServer } = world.getComponent(
      clientInfo,
      ClientInfo,
    )
    const { buffer } = world.getComponent(inputBuffer, InputBuffer)

    if (!localClientEntity || !updatedTransforms.includes(localClientEntity)) {
      return
    }

    const transform = world.getComponent(localClientEntity, Transform)
    const interp = world.tryGetMutableComponent(localClientEntity, InterpolationBuffer)

    if (!interp) {
      return
    }

    let j = 0

    while (j < buffer.length) {
      const input = buffer[j] as InputData

      if (input[4] <= lastFrameProcessedByServer) {
        buffer.splice(j, 1)
      } else {
        // Apply new inputs to the server transform.
        const copy = { ...transform }
        applyInput(input, copy)
        // Copy new state to the render transform.
        Object.assign(interp, copy)
        j++
      }
    }
  },
})
