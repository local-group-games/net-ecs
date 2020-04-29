import {
  added,
  changed,
  Component,
  createWorld,
  query,
  Storage,
} from "@net-ecs/ecs"
import { createPriorityAccumulator, encode, protocol } from "@net-ecs/net"
import { Server } from "@web-udp/server"
import { createServer } from "http"
import { createClientAdmin } from "./client_admin"
import { health, position, sleep, velocity } from "./components"
import { gravity, movement } from "./systems"

export * from "./components"
export * from "./tags"

export function start() {
  let last_update_u = 0

  const PORT = process.env.PORT || 8000
  const UPDATE_SIZE = 30
  const TICK_RATE = 60
  const SEND_RATE = 20

  const systems = [gravity, movement]
  const world = createWorld(systems)
  const server = createServer()
  const udp = new Server({ server })

  world.register(position)
  world.register(velocity)
  world.register(health)
  world.register(sleep)

  const clients = createClientAdmin({
    onClientConnect(client) {
      const payload: Component[][] = []

      for (const components of query(...componentsReliable).run(
        world.storage,
      )) {
        payload.push(components.slice(0, componentsReliable.length))
      }

      client.reliable.send(encode(protocol.entitiesCreated(payload)))
    },
    onClientDisconnect(client) {
      console.log(`Client ${client.sessionId} disconnected`)
    },
    onConnectionError(error) {
      console.log(`A connection error occurred`, error)
    },
    onClientMessage(client, message) {
      console.log(`Received client message from ${client.sessionId}`)
    },
  })

  udp.connections.subscribe(clients.handleConnection)

  const priorities = createPriorityAccumulator({
    [position.name]: 2,
    [velocity.name]: 1,
  })

  const componentsReliable = [health]
  const componentsUnreliable = [position, velocity]

  const queryAdded = query(...componentsReliable).filter(added())
  const queryReliable = query(...componentsReliable).filter(changed())
  const queryUnreliable = query(...componentsUnreliable)

  function* unreliable(storage: Storage) {
    for (const components of queryUnreliable.run(storage)) {
      // Use length of networked component types since the length of the query
      // result is not guaranteed to be the same
      for (let i = 0; i < componentsUnreliable.length; i++) {
        priorities.update(components[i])
      }
    }

    yield* priorities
  }

  function* reliable(storage: Storage) {
    for (const components of queryReliable.run(storage)) {
      for (let i = 0; i < componentsReliable.length; i++) {
        yield components[i]
      }
    }
  }

  setInterval(() => {
    let u = UPDATE_SIZE
    let t = Date.now()
    let dt = t - last_update_u

    world.tick(dt)

    const added_reliable = Array.from(queryAdded.run(world.storage))
    const state_update_reliable = Array.from(reliable(world.storage))
    const state_update_unreliable: Component[] = []

    for (const c of unreliable(world.storage)) {
      u--
      state_update_unreliable.push(c)
      if (u <= 0) {
        break
      }
    }

    const send_a = added_reliable.length > 0
    const send_r = state_update_reliable.length > 0
    const send_u =
      state_update_unreliable.length > 0 && dt >= (1 / SEND_RATE) * 1000

    for (const client of clients) {
      if (send_a) {
        const message = protocol.entitiesCreated(added_reliable)
        client.reliable.send(encode(message))
      }
      if (send_r) {
        const message = protocol.stateUpdate(state_update_reliable, {})
        client.reliable.send(encode(message))
      }
      if (send_u) {
        const message = protocol.stateUpdate(state_update_unreliable, {})
        client.unreliable.send(encode(message))
        last_update_u = t
      }
    }
  }, (1 / TICK_RATE) * 1000)

  const entities = []

  setInterval(() => {
    const components: Component[] = [
      { name: "health", value: 100 },
      { name: "position", x: 0, y: 0 },
      { name: "velocity", x: Math.random() * 2, y: Math.random() * 2 },
      { name: "sleep", value: 0 },
    ]
    const entity = world.create(components)

    entities.unshift(entity)
    components.forEach(c => (c.entity = entity))

    if (entities.length >= 5) {
      world.remove(entities.pop())
    }
  }, 2000)

  server.listen(PORT)
}
