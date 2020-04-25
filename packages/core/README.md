# `@net-ecs/core`

Core of net-ecs including storage, entity, component, and query creation.

## Example Usage

```ts
import {
  createComponentType,
  createStorage,
  createSystem,
  query,
  number,
  changed,
} from "@net-ecs/core"

const storage = createStorage()

const Health = {
  name: "health",
  schema: {
    value: number,
  }
}

const DamageOverTime = {
  name: "damage_over_time",
  schema: {
    start: number,
    duration: number,
    damagePerSecond: number,
  },
}

storage.register(Health)
storage.register(DamageOverTime)

storage.insert([
  { name: Health.name, value: 100 },
  { name: DamageOverTime.name, ticks: 10, damage: 1 },
])

for (const [health, dot] of query(Health, DamageOverTime).run(storage)) {
  mut(health).value -= dot.damage
  mut(dot).ticks--

  if (dot.ticks <= 0) {
    storage.remove(entity, DamageOverTime)
  }
}

for (const [health] of query(Health).filter(changed).run(storage)) {
  if (health.value <= 0) {
    storage.remove(entity)
  }
}

const [health] = Array.from(query(Health).run(storage))
const dots = Array.from(query(DamageOverTime))

console.assert(health.value === 99)
console.assert(dots.length === 0)
```