import { createNetEcsServer } from "@net-ecs/server"
import Victor from "victor"
import { Boid, Neighbors, Transform, Velocity } from "./components"
import { boidSystem, movingSystem, neighborSystem } from "./systems"

export * from "./components"
export * from "./systems"

export function createNetEcsExampleServer() {
  const server = createNetEcsServer({
    network: {
      priorities: {
        Transform: {
          weight: 1,
          unreliable: true,
        },
        Velocity: {
          weight: 2,
          unreliable: true,
        },
      },
      unreliableSendRate: (1 / 10) * 1000,
      updateSize: 20,
    },
  })

  server.world.registerComponentFactory(Boid)
  server.world.registerComponentFactory(Neighbors)
  server.world.registerComponentFactory(Transform)
  server.world.registerComponentFactory(Velocity)

  function addBoid() {
    const velocity = new Victor(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize()
    const entity = server.world.createEntity()

    server.world.addComponent(entity, Transform, Math.random() * 800, Math.random() * 600)
    server.world.addComponent(entity, Boid)
    server.world.addComponent(entity, Neighbors)
    server.world.addComponent(entity, Velocity, velocity.x, velocity.y)
  }

  server.world.addSystem(neighborSystem)
  server.world.addSystem(boidSystem)
  server.world.addSystem(movingSystem)

  for (let i = 0; i < 10; i++) {
    addBoid()
  }

  setInterval(() => server.world.tick((1 / 60) * 1000), (1 / 60) * 1000)

  return server
}
