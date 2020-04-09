import { array, createComponentType, number } from "@net-ecs/core"

export const InputBuffer = createComponentType({
  name: "input_buffer",
  schema: {
    buffer: array(array(number)),
  },
})
