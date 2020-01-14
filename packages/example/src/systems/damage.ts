import { createSystem, With } from "@net-ecs/core"
import { Health } from "../components/health"

const query = { damageable: [With(Health)] }

const DAMAGE_PER_SECOND = 10

export const damage = createSystem(query, (entityAdmin, { damageable }) => {
  for (const entity of damageable) {
    const health = entityAdmin.getComponent(entity, Health)

    health.value -= DAMAGE_PER_SECOND * (entityAdmin.clock.step / 1000)

    if (health.value <= 0) {
      entityAdmin.destroyEntity(entity)
    }
  }
})
