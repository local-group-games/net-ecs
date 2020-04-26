// @ts-nocheck
import { createWorld, SystemAPI, query, Chunk } from "@net-ecs/ecs"
import { graphics } from "./graphics"

const position = { name: "position" }
const velocity = { name: "velocity" }

enum Tags {
  Normal = 1,
  Special = 2,
  Awake = 4,
}

const size = 4
const floorSize = 10
const floorOffset = 600 - size - floorSize

const movementQuery = query(position, velocity).filter(Tags.Awake)
const movement = (dt: number, { mut, storage, untag }: SystemAPI<number>) => {
  for (let [p, v] of movementQuery.run(storage)) {
    p = mut(p)

    const { x, y } = p

    p.x += v.x
    p.y += v.y

    // put entities to sleep that haven't moved recently
    if (Math.abs(x - p.x) < 0.05 && Math.abs(y - p.y) < 0.05) {
      p.sleep += 1
      if (p.sleep >= 5) {
        untag(v.entity, Tags.Awake)
        continue
      }
    } else {
      p.sleep = 0
    }

    if (v.y > 0 && p.y >= floorOffset) {
      v = mut(v)
      // bounce and restitution
      v.y = -(v.y * 0.5)
      v.x *= 0.5
      // snap
      p.y = floorOffset
      continue
    }
  }
}
const gravityQuery = query(velocity).filter(Tags.Awake)
const gravity = (dt: number, { mut, storage }: SystemAPI<number>) => {
  for (let [v] of gravityQuery.run(storage)) {
    v = mut(v)
    v.y += 0.1
  }
}

const renderFilter = {
  matchChunkSet() {
    return true
  },
  matchChunk(chunk: Chunk) {
    for (let i = 0; i < chunk.components.length; i++) {
      const component = chunk.components[i]

      if (component.x <= 800 && component.y <= 600) {
        return true
      }
    }

    return false
  },
}
const renderQuery = query(position).filter(renderFilter, Tags.Normal)
const renderSpecialQuery = query(position).filter(renderFilter, Tags.Special)
const render = (dt: number, { storage }: SystemAPI<number>) => {
  graphics.clear()

  for (const [p] of renderQuery.run(storage)) {
    graphics.beginFill(0xffffff)
    graphics.drawRect(p.x, p.y, 4, 4)
    graphics.endFill()
  }
  for (const [p] of renderSpecialQuery.run(storage)) {
    graphics.beginFill(0xff0000)
    graphics.drawRect(p.x, p.y, 4, 4)
    graphics.endFill()
  }
}

const world = createWorld([gravity, movement, render])

world.register(position)
world.register(velocity)

let i = 0

const interval = setInterval(() => {
  for (let i = 0; i < 100; i++) {
    world.create(
      [
        {
          name: "position",
          x: Math.random() * 20,
          y: Math.random() * 20,
          sleep: 1,
        },
        { name: "velocity", x: Math.random() * 10, y: Math.random() * 10 },
      ],
      (Math.random() > 0.5 ? Tags.Special : Tags.Normal) | Tags.Awake,
    )
  }
  i++

  if (i >= 100) {
    clearInterval(interval)
  }
}, 100)

let t = 0

function loop(ts: number = t) {
  world.tick(t - ts)
  t = ts
  requestAnimationFrame(loop)
}

loop()
