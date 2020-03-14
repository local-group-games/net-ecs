import { createComponentFactory, Entity } from "@net-ecs/core"

const schema = {
  near: [] as Entity[],
  far: [] as Entity[],
}

export const Neighbors = createComponentFactory(
  "Neighbors",
  schema,
  (neighbors, near: Entity[] = neighbors.near, far: Entity[] = neighbors.far) => {
    neighbors.near = near
    neighbors.far = far
  },
)
