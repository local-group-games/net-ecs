import { createEntityAdmin } from "@net-ecs/core"
import { Server } from "@web-udp/server"
import { createServer } from "http"
import { createClientAdmin } from "./client_admin"
import { createNetworkSystem } from "./systems/system_network"
import { NetEcsServerOptions } from "./types"

export function createNetEcsServer(options: NetEcsServerOptions) {
  const server = createServer()
  const udp = new Server({ server })
  const world = createEntityAdmin(options.world)
  const onConnectionError = (event: { error: string }) => {
    console.error(event.error)
  }
  const clients = createClientAdmin(onConnectionError)
  const network = createNetworkSystem(world, clients, options.network)

  udp.connections.subscribe(clients.registerConnection)
  world.addSystem(network)

  return {
    world,
    listen: (port: number) => {
      server.listen(port)
    },
  }
}
