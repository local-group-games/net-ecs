import { Signal } from "@web-udp/protocol"
import { Server } from "@web-udp/server"

export type PriorityConfig = {
  [type: string]: {
    weight: number
    unreliable: boolean
  }
}

export type Connection = Server["connections"] extends Signal<infer _>
  ? _
  : never
export type Metadata = { sessionId: string; reliable: boolean }

export type ServerClient = {
  sessionId: string
  reliable: Connection
  unreliable: Connection
  initialized: boolean
}

export type NetworkOptions = {
  priorities: PriorityConfig
  unreliableUpdateSize: number
  unreliableSendRate: number
}
