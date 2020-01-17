import { createSystem, With } from "@net-ecs/core"
import Victor from "victor"
import { Boid, Neighbors, Transform, Velocity } from "../components"

const SEPARATION_WEIGHT = 0.08
const COHESION_WEIGHT = 0.04
const ALIGNMENT_WEIGHT = 0.02

const cohesion = new Victor(0, 0)
const separation = new Victor(0, 0)
const alignment = new Victor(0, 0)
const normalizedVelocity = new Victor(0, 0)

const sum = { x: 0, y: 0 }

export const boidSystem = createSystem(
  "boidSystem",
  (world, entities) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const boid = world.getComponent(entity, Boid)
      const position = world.getComponent(entity, Transform)
      const neighbors = world.tryGetComponent(entity, Neighbors)

      if (!neighbors) {
        continue
      }

      const velocity = world.getComponent(entity, Velocity)
      const numberOfNeighborsFar = neighbors.far.length

      sum.x = 0
      sum.y = 0

      for (let i = 0; i < numberOfNeighborsFar; i++) {
        const position = world.getComponent(neighbors.far[i], Transform)
        sum.x += position.x
        sum.y += position.y
      }

      cohesion.x = sum.x / numberOfNeighborsFar
      cohesion.y = sum.y / numberOfNeighborsFar
      cohesion.subtractScalarX(position.x)
      cohesion.subtractScalarY(position.y)

      if (sum.x === 0 && sum.y === 0) {
        boid.cohesionX = 0
        boid.cohesionY = 0
      } else {
        boid.cohesionX = cohesion.normalize().x
        boid.cohesionY = cohesion.y
      }

      const numberOfNeighborsNear = neighbors.near.length

      sum.x = 0
      sum.y = 0

      for (let i = 0; i < numberOfNeighborsNear; i++) {
        const position = world.getComponent(neighbors.near[i], Transform)
        sum.x += position.x
        sum.y += position.y
      }

      separation.x = sum.x / numberOfNeighborsNear
      separation.y = sum.y / numberOfNeighborsNear
      separation.subtractScalarX(position.x)
      separation.subtractScalarY(position.y)

      if (sum.x === 0 && sum.y === 0) {
        boid.separationX = 0
        boid.separationY = 0
      } else {
        boid.separationX = -separation.normalize().x
        boid.separationY = -separation.y
      }

      alignment.x = velocity.x
      alignment.y = velocity.y
      alignment.normalize()

      for (const neighbor of neighbors.far) {
        const velocity = world.getComponent(neighbor, Velocity)

        alignment.addScalarX(velocity.x)
        alignment.addScalarY(velocity.y)
        alignment.normalize()
      }

      boid.alignmentX = alignment.normalize().x
      boid.alignmentY = alignment.y

      velocity.x += boid.cohesionX * COHESION_WEIGHT
      velocity.y += boid.cohesionY * COHESION_WEIGHT
      velocity.x += boid.separationX * SEPARATION_WEIGHT
      velocity.y += boid.separationY * SEPARATION_WEIGHT
      velocity.x += boid.alignmentX * ALIGNMENT_WEIGHT
      velocity.y += boid.alignmentY * ALIGNMENT_WEIGHT
      normalizedVelocity.x = velocity.x
      normalizedVelocity.y = velocity.y
      normalizedVelocity.normalize()
      velocity.x = normalizedVelocity.x
      velocity.y = normalizedVelocity.y
    }
  },
  [With(Boid), With(Neighbors), With(Transform), With(Velocity)],
)
