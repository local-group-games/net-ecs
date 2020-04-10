import { NetEcsClient } from "@net-ecs/client"
import { createSystem, With } from "@net-ecs/core"
import { applyInput, InputData, protocol } from "@net-ecs/example-server"
import { ClientInfo } from "../components/component_client_info"
import { InputBuffer } from "../components/component_input_buffer"
import { RenderTransform } from "../components/component_render_transform"

export function createInputSystem(client: NetEcsClient) {
  const keyMap: { [key: string]: boolean } = {
    ArrowUp: false,
    ArrowRight: false,
    ArrowDown: false,
    ArrowLeft: false,
  }

  window.addEventListener("keydown", e => {
    if (e.repeat) {
      return
    }
    keyMap[e.key] = true
  })

  window.addEventListener("keyup", e => {
    keyMap[e.key] = false
  })

  const input = createSystem({
    name: "input",
    query: [[With(ClientInfo)], [With(InputBuffer)]],
    execute(world, [clientInfo], [inputBuffer]) {
      const tick = world.clock.tick
      const { localClientEntity } = world.getComponent(clientInfo, ClientInfo)
      const input: InputData = [
        ~~keyMap.ArrowUp,
        ~~keyMap.ArrowRight,
        ~~keyMap.ArrowDown,
        ~~keyMap.ArrowLeft,
        tick,
        world.clock.step,
      ]

      if (localClientEntity) {
        const renderTransform = world.tryGetMutableComponent(
          localClientEntity,
          RenderTransform,
        )

        if (renderTransform) {
          // Do client-side prediction.
          applyInput(input, renderTransform)
        }
      }

      const { buffer } = world.getComponent(inputBuffer, InputBuffer)

      buffer.push(input)
      client.sendUnreliable(protocol.move(tick, input))
    },
  })

  return input
}
