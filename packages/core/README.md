# `@net-ecs/core`

Core of net-ecs including world, entity, component, and system creation.

## Usage

```ts
import {
  createEntityAdmin,
  createComponentType,
  createSystem,
  With,
  number
} from "@net-ecs/core"

const world = createEntityAdmin()

const Health = createComponentType({
  name: "health",
  schema: {
    value: number,
  }
})

const DamageOverTime = createComponentType(
  name: "damage_over_time",
  schema: {
    start: number,
    duration: number,
    damagePerSecond: number,
  },
  initialize(component, duration: number, damagePerSecond: number, start: number) {
    component.duration = duration
    component.damagePerSecond = damagePerSecond
    component.start = start
  },
)

const damage = createSystem({
  name: "damage",
  queries: [
    [With(Health), With(DamageOverTime)],
  ],
  execute(world, entities) {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const health = world.getMutableComponent(entity, Health)
      const { start, duration, damagePerSecond } = world.getComponent(
        entity,
        DamageOverTime,
      )

      if (world.clock.time >= start + duration) {
        world.removeComponent(entity, DamageOverTime)
      } else {
        health.value -= damagePerSecond * world.clock.step
      }

      if (health.value <= 0) {
        world.destroyEntity(entity)
      }
    }
  },
})

const entity = world.createEntity()

world.addSystem(damage)
world.addComponent(entity, Health, 100)
world.addComponent(entity, DamageOverTime, 1, 1, world.clock.time)
world.tick(1)
```

### Singleton components

```ts
const Brightness = createComponentType(
  name: "brightness",
  schema: { type: number, defaultValue: 100 }
)
const render = createSystem(
  "render",
  (world, [entity]) => {
    const brightness = world.getComponent(entity, Brightness)
    // do something with brightness component
  },
  [With(Brightness)],
)
world.createSingletonComponent(Brightness)
world.addSystem(render)
```
