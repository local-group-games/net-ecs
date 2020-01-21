import { createSystem, With } from "@net-ecs/core"
import Victor from "victor"
import { Neighbors, Transform } from "../components"

const NEAR = 40
const FAR = 100

const v1 = new Victor(0, 0)
const v2 = new Victor(0, 0)

export const neighborSystem = createSystem(
  "neighborSystem",
  (world, entities) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const neighbors = world.tryGetComponent(entity, Neighbors)
      const position = world.getComponent(entity, Transform)

      if (!neighbors) {
        continue
      }

      neighbors.near.length = 0
      neighbors.far.length = 0

      v1.x = position.x
      v1.y = position.y

      for (let i = 0; i < entities.length; i++) {
        const other = entities[i]

        if (other === entity) {
          continue
        }

        const otherPosition = world.getComponent(other, Transform)

        v2.x = otherPosition.x
        v2.y = otherPosition.y

        const distance = v1.distance(v2)

        if (distance <= FAR) {
          neighbors.far.push(other)
        }
        if (distance <= NEAR) {
          neighbors.near.push(other)
        }
      }
    }
  },
  [With(Transform), With(Neighbors)],
)