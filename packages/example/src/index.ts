import { createWorld } from "@net-ecs/core";
import * as components from "./components";
import * as systems from "./systems";
import { Transform } from "./components";

const world = createWorld([systems.damage, systems.movement]);
const health = components.Health(100);
const transform = components.Transform(1, 1);
const entity = world.createEntity(0, [health, transform]);

let previousTime: number = Date.now();

setInterval(() => {
  const now = Date.now();
  const timeStep = now - previousTime;

  world.tick(timeStep);

  console.log(world.tryGetComponent(entity, Transform));

  previousTime = now;
}, (1 / 60) * 1000);

(window as any).world = world;
(window as any).components = components;
(window as any).health = health;
(window as any).transform = transform;
