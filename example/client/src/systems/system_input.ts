import { NetEcsClient } from "@net-ecs/client"
import { createSystem, With } from "@net-ecs/core"
import { InputData, protocol, applyInput } from "@net-ecs/example-server"
import { InterpolationBuffer } from "../components"
import { ClientInfo } from "../components/component_client_info"
import { InputBuffer } from "../components/component_input_buffer"

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

      let send = false

      if (localClientEntity) {
        const interp = world.tryGetMutableComponent(localClientEntity, InterpolationBuffer)

        if (interp) {
          // Do client-side prediction.
          send = applyInput(input, interp)
        }
      }

      if (send) {
        const { buffer } = world.getComponent(inputBuffer, InputBuffer)

        buffer.push(input)
        client.sendUnreliable(protocol.move(tick, input))
      }
    },
  })

  return input
}
