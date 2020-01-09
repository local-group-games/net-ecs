import { createSystem } from "@net-ecs/core";
import { Health } from "../components/health";

const query = { entities: [Health] };

export const damage = createSystem(query, (world, { entities }) => {
  entities.forEach(entity => {
    const health = world.getComponent(entity, Health);

    health.value -= 20 / world.clock.tick;

    if (health.value <= 0) {
      world.destroyEntity(entity);
    }
  });
});
