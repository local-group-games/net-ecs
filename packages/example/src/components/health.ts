import { createComponentFactory } from "@net-ecs/core";

export const Health = createComponentFactory(
  "Health",
  (max: number, currentHealth = max) => ({
    max,
    value: currentHealth
  })
);
