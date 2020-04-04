import { createComponentFactory } from "@net-ecs/core"

const schema = {
  cohesionX: 0,
  cohesionY: 0,
  separationX: 0,
  separationY: 0,
  alignmentX: 0,
  alignmentY: 0,
}

export const Boid = createComponentFactory(
  "boid",
  schema,
  (
    boid,
    cohesionX: number = boid.cohesionX,
    cohesionY: number = boid.cohesionY,
    separationX: number = boid.separationX,
    separationY: number = boid.separationY,
    alignmentX: number = boid.alignmentX,
    alignmentY: number = boid.alignmentY,
  ) => {
    boid.cohesionX = cohesionX
    boid.cohesionY = cohesionY
    boid.separationX = separationX
    boid.separationY = separationY
    boid.alignmentX = alignmentX
    boid.alignmentY = alignmentY
  },
)
