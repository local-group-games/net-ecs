import { createComponentType, Entity, array, number } from "@net-ecs/core"

export const Neighbors = createComponentType({
  name: "neighbors",
  schema: {
    near: array(number),
    far: array(number),
  },
})
