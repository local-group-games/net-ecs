import { createSystem } from "@net-ecs/core"
import { Transform } from "../components/transform"

const query = { moving: [Transform] }

export const movement = createSystem(query, (entityAdmin, { moving }) => {
  for (const entity of moving) {
    const transform = entityAdmin.getComponent(entity, Transform)

    transform.x = Math.sin(entityAdmin.clock.time * 0.05)
    transform.y = Math.cos(entityAdmin.clock.time * 0.05)
  }
})
