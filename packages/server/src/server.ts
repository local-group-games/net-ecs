import { createEntityAdmin } from "@net-ecs/core"
import { Server } from "@web-udp/server"
import { createServer } from "http"
import { createNetworkSystem } from "./systems/system_network"
import { Metadata, NetEcsServerClient, NetEcsServerOptions } from "./types"

export function createNetEcsServer(options: NetEcsServerOptions) {
  const server = createServer()
  const udp = new Server({ server })
  const world = createEntityAdmin()
  const clients: NetEcsServerClient[] = []
  const networkSystem = createNetworkSystem(world, clients, options.network)

  udp.connections.subscribe(connection => {
    const { sessionId, reliable }: Metadata = connection.metadata
    let client = clients.find(client => client.sessionId === sessionId)

    if (!client) {
      client = { sessionId, reliable: null, unreliable: null }
      clients.push(client)
    }

    if (reliable) {
      client.reliable = connection
    } else {
      client.unreliable = connection
    }

    connection.closed.subscribe(() => {
      clients.splice(clients.indexOf(client), 1)
    })
  })

  world.addSystem(networkSystem)

  return {
    world,
    listen: (port: number) => {
      server.listen(port)
    },
  }
}
