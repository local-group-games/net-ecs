import { createComponentType, number } from "@net-ecs/core"

export const Boid = createComponentType({
  name: "boid",
  schema: {
    cohesionX: number,
    cohesionY: number,
    separationX: number,
    separationY: number,
    alignmentX: number,
    alignmentY: number,
  },
})
