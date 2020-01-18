import { createEntityAdmin, Entity } from "@net-ecs/core"
import Victor from "victor"
import { Boid, Color, Neighbors, Transform, Velocity } from "./components"
import { app } from "./graphics"
import {
  boidSystem,
  colorTransitionSystem,
  movingSystem,
  neighborSystem,
  renderSystem,
} from "./systems"
import { mount } from "@net-ecs/debug"

mount(document.getElementById("ui")!)

const NUMBER_OF_BOIDS = 10

const world = createEntityAdmin()
const debug_world = createEntityAdmin()
const entities: Entity[] = []

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

world.createSingletonComponent(Color)

world.addSystem(neighborSystem)
world.addSystem(boidSystem)
world.addSystem(movingSystem)
world.addSystem(renderSystem)
world.addSystem(colorTransitionSystem)

app.ticker.add(() => world.tick(app.ticker.deltaMS / 1000))

document.addEventListener("keydown", e => {
  if (e.key === "1") {
    for (let i = 0; i < NUMBER_OF_BOIDS; i++) addBoid()
  }

  if (e.key === "2") {
    for (let i = 0; i < NUMBER_OF_BOIDS; i++) {
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
