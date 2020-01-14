import {
  Added,
  createEntityAdmin,
  createSystem,
  Entity,
  With,
  Removed,
} from "@net-ecs/core"
import * as PIXI from "pixi.js"
import Victor from "victor"

const NUMBER_OF_BOIDS = 1
const SPEED = 50
const NEAR = 40
const FAR = 100
const SEPARATION_WEIGHT = 0.08
const COHESION_WEIGHT = 0.04
const ALIGNMENT_WEIGHT = 0.02

const app = new PIXI.Application({ antialias: true })
document.body.appendChild(app.view)

const world = createEntityAdmin()
const Position = world.createComponentFactory(
  "Position",
  {
    x: 0,
    y: 0,
  },
  (c, x, y) => {
    c.x = x
    c.y = y
  },
  NUMBER_OF_BOIDS,
)

const Velocity = world.createComponentFactory(
  "Velocity",
  {
    x: 0,
    y: 0,
  },
  (c, x = c.x, y = c.y) => {
    c.x = x
    c.y = y
  },
  NUMBER_OF_BOIDS,
)

const Neighbors = world.createComponentFactory(
  "Neighbors",
  {
    near: [] as Entity[],
    far: [] as Entity[],
  },
  (c, near = c.near, far = c.far) => {
    c.near = near
    c.far = far
  },
  NUMBER_OF_BOIDS,
)

const Boid = world.createComponentFactory(
  "Boid",
  {
    cohesionX: 0,
    cohesionY: 0,
    separationX: 0,
    separationY: 0,
    alignmentX: 0,
    alignmentY: 0,
  },
  (
    c,
    cohesionX = c.cohesionX,
    cohesionY = c.cohesionY,
    separationX = c.separationX,
    separationY = c.separationY,
    alignmentX = c.alignmentX,
    alignmentY = c.alignmentY,
  ) => {
    c.cohesionX = cohesionX
    c.cohesionY = cohesionY
    c.separationX = separationX
    c.separationY = separationY
    c.alignmentX = alignmentX
    c.alignmentY = alignmentY
  },
  NUMBER_OF_BOIDS,
)

const movingSystem = createSystem(
  { entities: [With(Position), With(Velocity)] },
  (world, { entities }) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const position = world.getComponent(entity, Position)
      const velocity = world.getComponent(entity, Velocity)

      position.x += velocity.x * context.dt * SPEED
      position.y += velocity.y * context.dt * SPEED

      if (position.x < 0) {
        position.x = position.x + 800
      } else if (position.x > 800) {
        position.x = position.x - 800
      }
      if (position.y < 0) {
        position.y = position.y + 600
      } else if (position.y > 600) {
        position.y = position.y - 600
      }
    }
  },
)

const v1 = new Victor(0, 0)
const v2 = new Victor(0, 0)

const neighborSystem = createSystem(
  { entities: [With(Position), With(Neighbors)] },
  (world, { entities }) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const neighbors = world.tryGetComponent(entity, Neighbors)
      const position = world.getComponent(entity, Position)

      if (!neighbors) {
        continue
      }

      neighbors.near.length = 0
      neighbors.far.length = 0

      v1.x = position.x
      v1.y = position.y

      for (let i = 0; i < entities.length; i++) {
        const other = entities[i]

        if (other === entity) {
          continue
        }

        const otherPosition = world.getComponent(other, Position)

        v2.x = otherPosition.x
        v2.y = otherPosition.y

        const distance = v1.distance(v2)

        if (distance <= FAR) {
          neighbors.far.push(other)
        }
        if (distance <= NEAR) {
          neighbors.near.push(other)
        }
      }
    }
  },
)

const cohesion = new Victor(0, 0)
const separation = new Victor(0, 0)
const alignment = new Victor(0, 0)
const normalizedVelocity = new Victor(0, 0)

const _sum = { x: 0, y: 0 }
const _sum2 = { x: 0, y: 0 }

const boidSystem = createSystem(
  { entities: [With(Boid), With(Neighbors), With(Position), With(Velocity)] },
  (world, { entities }) => {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const boid = world.getComponent(entity, Boid)
      const position = world.getComponent(entity, Position)
      const neighbors = world.tryGetComponent(entity, Neighbors)

      if (!neighbors) {
        continue
      }

      const velocity = world.getComponent(entity, Velocity)
      {
        const numberOfNeighbors = neighbors.far.length

        _sum.x = 0
        _sum.y = 0

        for (let i = 0; i < numberOfNeighbors; i++) {
          const position = world.getComponent(neighbors.far[i], Position)
          _sum.x += position.x
          _sum.y += position.y
        }

        cohesion.x = _sum.x / numberOfNeighbors
        cohesion.y = _sum.y / numberOfNeighbors
        cohesion.subtractScalarX(position.x)
        cohesion.subtractScalarY(position.y)

        if (_sum.x === 0 && _sum.y === 0) {
          boid.cohesionX = 0
          boid.cohesionY = 0
        } else {
          boid.cohesionX = cohesion.normalize().x
          boid.cohesionY = cohesion.y
        }
      }
      {
        const numberOfNeighbors = neighbors.near.length

        _sum2.x = 0
        _sum2.y = 0

        for (let i = 0; i < numberOfNeighbors; i++) {
          const position = world.getComponent(neighbors.near[i], Position)
          _sum2.x += position.x
          _sum2.y += position.y
        }

        separation.x = _sum2.x / numberOfNeighbors
        separation.y = _sum2.y / numberOfNeighbors
        separation.subtractScalarX(position.x)
        separation.subtractScalarY(position.y)

        if (_sum2.x === 0 && _sum2.y === 0) {
          boid.separationX = 0
          boid.separationY = 0
        } else {
          boid.separationX = -separation.normalize().x
          boid.separationY = -separation.y
        }
      }
      {
        alignment.x = velocity.x
        alignment.y = velocity.y
        alignment.normalize()

        for (const neighbor of neighbors.far) {
          const velocity = world.getComponent(neighbor, Velocity)!
          alignment.addScalarX(velocity.x)
          alignment.addScalarY(velocity.y)
          alignment.normalize()
        }
        boid.alignmentX = alignment.normalize().x
        boid.alignmentY = alignment.y
      }
      velocity.x += boid.cohesionX * COHESION_WEIGHT
      velocity.y += boid.cohesionY * COHESION_WEIGHT
      velocity.x += boid.separationX * SEPARATION_WEIGHT
      velocity.y += boid.separationY * SEPARATION_WEIGHT
      velocity.x += boid.alignmentX * ALIGNMENT_WEIGHT
      velocity.y += boid.alignmentY * ALIGNMENT_WEIGHT
      normalizedVelocity.x = velocity.x
      normalizedVelocity.y = velocity.y
      normalizedVelocity.normalize()
      velocity.x = normalizedVelocity.x
      velocity.y = normalizedVelocity.y
    }
  },
)

const v = new Victor(0, 0)

const renderSystem = createSystem(
  { entities: [With(Position), With(Velocity)] },
  (world, { entities }) => {
    graphics.clear()
    graphics.lineStyle(1, 0xffffff)

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const velocity = world.getComponent(entity, Velocity)
      const position = world.getComponent(entity, Position)

      graphics.drawCircle(position.x, position.y, 4)
      v.x = velocity.x
      v.y = velocity.y
      v.normalize()
      v.multiplyScalar(10)
      graphics.lineStyle(1, 0xffffff, 1)
      graphics.moveTo(position.x, position.y)
      graphics.lineTo(position.x + v.x, position.y + v.y)
    }
  },
)

const entities: any[] = []

const testSystem = createSystem(
  { entities: [Added(Boid)] },
  (world, { entities }) => {
    console.log(entities.length)
  },
)

function addBoid() {
  const velocity = new Victor(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
  ).normalize()
  const entity = world.createEntity(
    Position(Math.random() * 800, Math.random() * 600),
    Boid(),
    Neighbors(),
    Velocity(velocity.x, velocity.y),
  )

  entities.push(entity)
}

for (let i = 0; i < NUMBER_OF_BOIDS; i++) {
  addBoid()
}

const graphics = new PIXI.Graphics()
app.stage.addChild(graphics)

world.addSystem(neighborSystem)
world.addSystem(boidSystem)
world.addSystem(movingSystem)
world.addSystem(renderSystem)
world.addSystem(testSystem)

const context = {
  dt: 0,
  ticks: 0,
}

app.ticker.add(() => {
  context.dt = app.ticker.deltaMS / 1000
  context.ticks = context.ticks + 1

  if (context.ticks % 60 === 0) {
    console.log(Math.floor(app.ticker.FPS))
  }

  world.tick(context.dt)
})

document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    app.ticker.started ? app.ticker.stop() : app.ticker.start()
  }

  if (e.key === "ArrowUp") {
    for (let i = 0; i < 10; i++) addBoid()
  }

  if (e.key === "ArrowDown") {
    for (let i = 0; i < 10; i++) {
      const e = entities.pop()

      if (e) {
        world.destroyEntity(e)
      }
    }
  }
})
