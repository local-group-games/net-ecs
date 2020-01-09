import { createSystem } from "@net-ecs/core";
import { Transform } from "../components/transform";

const query = { entities: [Transform] };

export const movement = createSystem(query, (world, { entities }) => {
  entities.forEach(entity => {
    const transform = world.getComponent(entity, Transform);

    transform.x = Math.sin(world.clock.time * 0.05);
    transform.y = Math.cos(world.clock.time * 0.05);
  });
});
