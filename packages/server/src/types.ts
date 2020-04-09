import { EntityAdminOptions, CustomMessage, EntityAdmin } from "@net-ecs/core"
import { Signal } from "@web-udp/protocol"
import { Server } from "@web-udp/server"

export type PriorityConfig = {
  [type: string]: {
    weight: number
    unreliable: boolean
  }
}

export type Connection = Server["connections"] extends Signal<infer _> ? _ : never
export type Metadata = { sessionId: string; reliable: boolean }

export type NetEcsServerClient = {
  sessionId: string
  reliable: Connection | null
  unreliable: Connection | null
  initialized: boolean
}

export type NetEcsServerNetworkOptions<
  M extends CustomMessage<number, any> = CustomMessage<number, any>
> = {
  priorities: PriorityConfig
  unreliableUpdateSize: number
  unreliableSendRate: number
  onConnectionError?: (event: { error: string }) => void
  onClientConnect?: (client: NetEcsServerClient, world: EntityAdmin) => void
  onClientDisconnect?: (client: NetEcsServerClient, world: EntityAdmin) => void
  onClientMessage?: (message: M, client: NetEcsServerClient, world: EntityAdmin) => void
}

export type NetEcsServerOptions = {
  network: NetEcsServerNetworkOptions
  world?: EntityAdminOptions
}
