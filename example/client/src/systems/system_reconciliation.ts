import { ServerInfo } from "@net-ecs/client"
import { createSystem, With } from "@net-ecs/core"
import { applyInput, InputData, Transform } from "@net-ecs/example-server"
import { ClientInfo } from "../components/component_client_info"
import { InputBuffer } from "../components/component_input_buffer"

export const reconciliation = createSystem({
  name: "reconciliation",
  query: [[With(ClientInfo)], [With(ServerInfo)], [With(InputBuffer)]],
  execute(world, [client], [server], [inputBuffer]) {
    const { localClientEntity } = world.getComponent(client, ClientInfo)

    if (!localClientEntity) {
      return
    }

    const { lastRegisteredClientTick } = world.getComponent(server, ServerInfo)
    const { buffer } = world.getComponent(inputBuffer, InputBuffer)
    const transform = world.tryGetComponent(localClientEntity, Transform)

    if (!(transform && world.isChangedComponent(transform))) {
      return
    }

    let j = 0

    while (j < buffer.length) {
      const input = buffer[j] as InputData

      if (input[4] <= lastRegisteredClientTick) {
        buffer.splice(j, 1)
      } else {
        // Apply new inputs to the server transform.
        applyInput(input, transform)
        j++
      }
    }
  },
})
