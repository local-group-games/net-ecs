import {
  createEntityAdmin,
  createSystem,
  createComponentFactory,
  With,
  Without,
} from "@net-ecs/core"
import Victor from "victor"
import { Boid, Neighbors, Transform, Velocity } from "./components"
import { app } from "./graphics"
import {
  boidSystem,
  movingSystem,
  neighborSystem,
  renderSystem,
} from "./systems"

const NUMBER_OF_BOIDS = 10

const world = createEntityAdmin()

const entities: any[] = []

const ComponentA = createComponentFactory("A", {}, obj => {})
const ComponentB = createComponentFactory("B", { n: 0 }, (obj, n: number) => {
  obj.n = n
})
const perfTestSystem = createSystem(
  (world, a, b, neither) => {
    for (let i = 0; i < a.length; i++) {
      if (Math.random() > 0.5) {
        world.removeComponentFromEntity(a[i], ComponentA)
        world.addComponentToEntity(a[i], ComponentB, Math.random())
      }
    }

    for (let i = 0; i < b.length; i++) {
      if (Math.random() > 0.5) {
        world.removeComponentFromEntity(b[i], ComponentB)
        world.addComponentToEntity(b[i], ComponentA)
      }
    }

    for (let i = 0; i < neither.length; i++) {
      if (Math.random() > 0.5) {
        world.addComponentToEntity(neither[i], ComponentA)
      } else {
        world.addComponentToEntity(neither[i], ComponentB, Math.random())
      }
    }
  },
  [With(ComponentA)],
  [With(ComponentB)],
  [Without(ComponentA), Without(ComponentB)],
)

function addBoid() {
  const velocity = new Victor(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
  ).normalize()
  const entity = world.createEntity()
  world.addComponentToEntity(
    entity,
    Transform,
    Math.random() * 800,
    Math.random() * 600,
  )
  world.addComponentToEntity(entity, Boid)
  world.addComponentToEntity(entity, Neighbors)
  world.addComponentToEntity(entity, Velocity, velocity.x, velocity.y)

  entities.push(entity)
}

for (let i = 0; i < NUMBER_OF_BOIDS; i++) {
  addBoid()
}

world.addSystem(neighborSystem)
world.addSystem(boidSystem)
world.addSystem(movingSystem)
world.addSystem(renderSystem)
world.addSystem(perfTestSystem)

app.ticker.add(() => {
  world.tick(app.ticker.deltaMS / 1000)
})

document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    app.ticker.started ? app.ticker.stop() : app.ticker.start()
  }

  if (e.key === "ArrowUp") {
    for (let i = 0; i < 1000; i++) addBoid()
  }

  if (e.key === "ArrowDown") {
    for (let i = 0; i < 1000; i++) {
      const e = entities.pop()

      if (e) {
        world.destroyEntity(e)
      } else {
        break
      }
    }
  }
})
;(window as any).world = world
