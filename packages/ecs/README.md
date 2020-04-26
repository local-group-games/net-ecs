# `@net-ecs/ecs`

The Entity-Component-System of net-ecs including storage, entity, component, and query creation.

## Storage

Components are organized into a `Storage`.

```ts
import { createStorage } from "@net-ecs/ecs"

const storage = createStorage()
```

Component types must be registered with the storage before inserting component data. A component type 

```ts
const Position = { name: "position" }
const Velocity = { name: "velocity" }

storage.register(Position)
storage.register(Velocity)
```

The `insert()` method associates one or more components with an integer id.

```ts
storage.insert(1, [
  { name: "position" },
  { name: "velocity" },
])
```

Storages can be queried.

```ts
import { query } from "@net-ecs/ecs"

const movement = query(Position, Velocity)

for (const [p, v] of movement.run(storage)) {
  p.x += v.x
  p.y += v.y
}
```

Entities can be filtered in one of two ways: bitmasks and filters. For example, if you want to only update the position of "dynamic" entities:

```ts
enum Tags {
  Dynamic = 1
}

storage.tag(1, Tags.Dynamic)

for (const [p, v] of movement.filter(Tags.Dynamic).run(storage)) {
  // p and v components belong to an entity tagged as Dynamic
}
```

Entities can be versioned. Versions of an entity can be incremented using the `storage.bump()` method:

```ts
storage.bump(1)
```

You can use a built-in filter to take advantage of versioning for change-detection:

```ts
import { changed } from "@net-ecs/ecs"

const filter = changed()
const filtered = movement.filter(filter)

storage.bump(1)

console.assert(Array.from(filtered.run(storage)).length === 1)
console.assert(Array.from(filtered.run(storage)).length === 0)
```
