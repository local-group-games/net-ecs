import { createComponentFactory } from "@net-ecs/core";

export const Transform = createComponentFactory(
  "Transform",
  (x = 0, y = 0) => ({
    x,
    y
  })
);
