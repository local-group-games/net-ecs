# `@net-ecs/core`

Core of net-ecs including world, entity, component, and system creation.

## Usage

```ts
import {
  createEntityAdmin,
  createComponentFactory,
  createSystem,
  With,
} from "@net-ecs/core"

const world = createEntityAdmin()

const Health = createComponentFactory(
  "health",
  { value: 0 },
  (obj, value: number) => {
    obj.value = value
  },
)

const DamageOverTimeEffect = createComponentFactory(
  "damageOverTimeEffect",
  { start: 0, duration: 0, damagePerSecond: 0 },
  (obj, duration: number, damagePerSecond: number, start: number) => {
    obj.duration = duration
    obj.damagePerSecond = damagePerSecond
    obj.start = start
  },
)

const damageSystem = createSystem(
  "damageSystem",
  (world, entities) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const health = world.getComponent(entity, Health)
      const { start, duration, damagePerSecond } = world.getComponent(
        entity,
        DamageOverTimeEffect,
      )

      if (world.clock.time >= start + duration) {
        world.removeComponent(entity, DamageOverTimeEffect)
      } else {
        health.value -= damagePerSecond * world.clock.step
      }

      if (health.value <= 0) {
        world.destroyEntity(entity)
      }
    }
  },
  [With(Health), With(DamageOverTimeEffect)],
)

const entity = world.createEntity()

world.addSystem(damageSystem)
world.addComponent(entity, Health, 100)
world.addComponent(entity, DamageOverTimeEffect, 1, 1, world.clock.time)
world.tick(1)
```

### Singleton components

```ts
const Volume = createComponentFactory(
  "Volume",
  { value: 100 },
  (obj, value: number) => {
    obj.value = value
  },
)
const volumeSystem = createSystem(
  "volumeSystem",
  (world, [entity]) => {
    const volume = world.getComponent(entity, Volume)
    // do something with volume component
  },
  [With(Volume)],
)
world.createSingletonComponent(Volume)
world.addSystem(volumeSystem)
```
