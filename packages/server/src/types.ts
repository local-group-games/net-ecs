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

export type NetEcsServerNetworkOptions = {
  priorities: PriorityConfig
  unreliableUpdateSize: number
  unreliableSendRate: number
}

export type NetEcsServerOptions = {
  network: NetEcsServerNetworkOptions
}
