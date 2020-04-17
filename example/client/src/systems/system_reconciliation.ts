import { ServerInfo } from "@net-ecs/client"
import { createSystem, With } from "@net-ecs/core"
import { applyInput, InputData, Transform } from "@net-ecs/example-server"
import { ExampleServerInfo } from "../components/component_example_server_info"
import { InputBuffer } from "../components/component_input_buffer"
import { debug } from "../debug"

export const reconciliation = createSystem({
  name: "reconciliation",
  query: [[With(ExampleServerInfo)], [With(ServerInfo)], [With(InputBuffer)]],
  execute(world, [client], [server], [inputBuffer]) {
    const { localClientEntity } = world.getComponent(client, ExampleServerInfo)

    if (!localClientEntity) {
      return
    }

    const { seq } = world.getComponent<any>(server, ServerInfo)
    const { buffer } = world.getComponent(inputBuffer, InputBuffer)
    const transform = world.tryGetComponent(localClientEntity, Transform)

    if (!(transform && world.isChangedComponent(transform))) {
      return
    }

    let j = 0

    while (j < buffer.length) {
      const input = buffer[j] as InputData

      if (input[4] <= (seq as number)) {
        buffer.splice(j, 1)
      } else {
        // Apply new inputs to the server transform.
        applyInput(input, transform)
        j++
      }
    }

    if (j > 0) {
      debug.log.info(`reconciled ${j} inputs`, {
        id: "recon",
        duration: 1000,
      })
    }
  },
})
