import * as PIXI from "pixi.js"
import Victor from "victor"
import { createEntityAdmin, createSystem, Entity } from "@net-ecs/core"

const NUMBER_OF_BOIDS = 100
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
  { entities: [Position, Velocity] },
  (world, { entities }) => {
    entities.forEach(entity => {
      const position = world.getComponent(entity, Position)!
      const velocity = world.getComponent(entity, Velocity)!
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
    })
  },
)

const neighborSystem = createSystem(
  { entities: [Position, Neighbors] },
  (world, { entities }) => {
    entities.forEach(entity => {
      const neighbors = world.getComponent(entity, Neighbors)!
      neighbors.near.length = 0
      neighbors.far.length = 0
      const position = world.getComponent(entity, Position)!
      const v1 = new Victor(position.x, position.y)
      entities.forEach(other => {
        if (other === entity) {
          return
        }
        const otherPosition = world.getComponent(other, Position)!
        const v2 = new Victor(otherPosition.x, otherPosition.y)
        const distance = v1.distance(v2)
        if (distance <= FAR) {
          neighbors.far.push(other)
        }
        if (distance <= NEAR) {
          neighbors.near.push(other)
        }
      })
    })
  },
)

const boidSystem = createSystem(
  { entities: [Boid, Neighbors, Position, Velocity] },
  (world, { entities }) => {
    entities.forEach(entity => {
      const boid = world.getComponent(entity, Boid)
      const position = world.getComponent(entity, Position)
      const neighbors = world.getComponent(entity, Neighbors)
      const velocity = world.getComponent(entity, Velocity)
      {
        const sum = neighbors.far.reduce(
          (sum, neighbor) => {
            const position = world.getComponent(neighbor, Position)
            sum.x += position.x
            sum.y += position.y
            return sum
          },
          { x: 0, y: 0 },
        )
        const numberOfNeighbors = neighbors.far.length
        const cohesion = new Victor(
          sum.x / numberOfNeighbors,
          sum.y / numberOfNeighbors,
        ).subtract(new Victor(position.x, position.y))
        if (sum.x === 0 && sum.y === 0) {
          boid.cohesionX = 0
          boid.cohesionY = 0
        } else {
          boid.cohesionX = cohesion.normalize().x
          boid.cohesionY = cohesion.y
        }
      }
      {
        const sum = neighbors.near.reduce(
          (sum, neighbor) => {
            const position = world.getComponent(neighbor, Position)
            sum.x += position.x
            sum.y += position.y
            return sum
          },
          { x: 0, y: 0 },
        )
        const numberOfNeighbors = neighbors.near.length
        const separation = new Victor(
          sum.x / numberOfNeighbors,
          sum.y / numberOfNeighbors,
        ).subtract(new Victor(position.x, position.y))
        if (sum.x === 0 && sum.y === 0) {
          boid.separationX = 0
          boid.separationY = 0
        } else {
          boid.separationX = -separation.normalize().x
          boid.separationY = -separation.y
        }
      }
      {
        const alignment = new Victor(velocity.x, velocity.y).normalize()
        for (const neighbor of neighbors.far) {
          const velocity = world.getComponent(neighbor, Velocity)!
          alignment.add(new Victor(velocity.x, velocity.y).normalize())
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
      const normalizedVelocity = new Victor(velocity.x, velocity.y).normalize()
      velocity.x = normalizedVelocity.x
      velocity.y = normalizedVelocity.y
    })
  },
)

//eslint-disable-next-line no-unused-vars
// const debugSystem = new flock.System(
//   entities => {
//     entities.forEach(entity => {
//       const position = entity.getComponent(Position)!
//       const boid = entity.getComponent(Boid)!
//       {
//         graphics.lineStyle(1, 0xffffff, 0.25)
//         graphics.drawCircle(position.value.x, position.value.y, FAR)
//         graphics.endFill()
//       }
//       {
//         graphics.lineStyle(1, 0xffffff, 0.25)
//         graphics.drawCircle(position.value.x, position.value.y, NEAR)
//         graphics.endFill()
//       }
//       {
//         graphics.lineStyle(1, 0xff0000)
//         graphics.drawCircle(position.value.x, position.value.y, 3)
//         graphics.endFill()
//       }
//       {
//         const velocity = entity.getComponent(Velocity)!
//         const v = new Victor(velocity.value.x, velocity.value.y)
//           .normalize()
//           .multiply(new Victor(10, 10))
//         graphics.lineStyle(1, 0xffffff, 1)
//         graphics.moveTo(position.value.x, position.value.y)
//         graphics.lineTo(position.value.x + v.x, position.value.y + v.y)
//       }
//       {
//         const alignment = boid.value.alignment
//         const a = new Victor(alignment.x, alignment.y).multiply(
//           new Victor(10, 10),
//         )
//         graphics.lineStyle(1, 0x0000ff, 1)
//         graphics.moveTo(position.value.x, position.value.y)
//         graphics.lineTo(position.value.x + a.x, position.value.y + a.y)
//       }
//       {
//         const cohesion = boid.value.cohesion
//         const c = new Victor(cohesion.x, cohesion.y).multiply(
//           new Victor(10, 10),
//         )
//         graphics.lineStyle(1, 0x00ff00, 1)
//         graphics.moveTo(position.value.x, position.value.y)
//         graphics.lineTo(position.value.x + c.x, position.value.y + c.y)
//       }
//       {
//         const separation = boid.value.separation
//         const s = new Victor(separation.x, separation.y).multiply(
//           new Victor(10, 10),
//         )
//         graphics.lineStyle(1, 0xffff00, 1)
//         graphics.moveTo(position.value.x, position.value.y)
//         graphics.lineTo(position.value.x + s.x, position.value.y + s.y)
//       }
//     })
//   },
//   [Boid, Position, Velocity],
// )

const renderSystem = createSystem(
  { entities: [Position, Velocity] },
  (world, { entities }) => {
    graphics.clear()
    graphics.lineStyle(1, 0xffffff)
    entities.forEach(entity => {
      const position = world.getComponent(entity, Position)
      {
        graphics.drawCircle(position.x, position.y, 4)
      }
      {
        const velocity = world.getComponent(entity, Velocity)
        const v = new Victor(velocity.x, velocity.y)
          .normalize()
          .multiply(new Victor(10, 10))
        graphics.lineStyle(1, 0xffffff, 1)
        graphics.moveTo(position.x, position.y)
        graphics.lineTo(position.x + v.x, position.y + v.y)
      }
    })
  },
)

const entities: any[] = []

function addBoid() {
  const entity = world.createEntity()
  entities.push(entity)
  world.addComponentToEntity(
    entity,
    Position(Math.random() * 800, Math.random() * 600),
  )
  world.addComponentToEntity(entity, Boid())
  world.addComponentToEntity(entity, Neighbors())
  const velocity = new Victor(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
  ).normalize()
  world.addComponentToEntity(entity, Velocity(velocity.x, velocity.y))
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

  // debugSystem.run(world);

  world.tick(context.dt)
})

document.addEventListener("keydown", () => {
  console.log("stopping!")
  app.ticker.stop()
})

document.addEventListener("click", () => {
  for (let i = 0; i < 10; i++) addBoid()
})
