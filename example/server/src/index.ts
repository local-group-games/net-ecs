import { createNetEcsServer } from "@net-ecs/server"
import Victor from "victor"
import { Boid, Neighbors, Transform, Velocity } from "./components"
import { flock, movement, neighbors } from "./systems"
import { Entity } from "@net-ecs/core/src"

export * from "./components"
export * from "./systems"

export function createNetEcsExampleServer() {
  const server = createNetEcsServer({
    network: {
      priorities: {
        transform: {
          weight: 2,
          unreliable: true,
        },
        velocity: {
          weight: 1,
          unreliable: true,
        },
      },
      unreliableSendRate: (1 / 20) * 1000,
      updateSize: 1000,
    },
  })

  server.world.registerComponentFactory(Boid)
  server.world.registerComponentFactory(Neighbors)
  server.world.registerComponentFactory(Transform)
  server.world.registerComponentFactory(Velocity)

  const boids: Entity[] = []

  function addBoid() {
    const velocity = new Victor(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize()
    const entity = server.world.createEntity()

    server.world.addComponent(entity, Transform, Math.random() * 800, Math.random() * 600)
    server.world.addComponent(entity, Boid)
    server.world.addComponent(entity, Neighbors)
    server.world.addComponent(entity, Velocity, velocity.x, velocity.y)

    boids.push(entity)
  }

  function removeBoid() {
    const boid = boids.shift()

    server.world.destroyEntity(boid)
  }

  server.world.addSystem(neighbors)
  server.world.addSystem(flock)
  server.world.addSystem(movement)

  for (let i = 0; i < 200; i++) {
    addBoid()
  }

  setInterval(() => server.world.tick((1 / 60) * 1000), (1 / 60) * 1000)

  // setInterval(() => {
  //   if (Math.random() > 0.5) {
  //     addBoid()
  //   } else {
  //     removeBoid()
  //   }
  // }, 2000)

  return server
}
