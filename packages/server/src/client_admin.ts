import { decode, Message, noop, EntityAdmin } from "@net-ecs/core"
import { Connection, NetEcsServerClient, NetEcsServerNetworkOptions } from "./types"

export interface NetEcsClientAdmin {
  [Symbol.iterator]: () => Generator<NetEcsServerClient>
  registerConnection(connection: Connection): void
  messages: (client: NetEcsServerClient) => Generator<Message>
}

export function createClientAdmin(
  world: EntityAdmin,
  options: NetEcsServerNetworkOptions,
): NetEcsClientAdmin {
  const { onClientConnect = noop, onConnectionError = noop, onClientDisconnect = noop } = options
  const clients: NetEcsServerClient[] = []
  const messages = new WeakMap<NetEcsServerClient, Message[]>()

  function registerConnection(connection: Connection) {
    const { metadata } = connection

    if (!metadata.sessionId) {
      throw new Error()
    }

    let client = clients.find(client => client.sessionId === metadata.sessionId)

    if (!client) {
      client = {
        sessionId: metadata.sessionId,
        reliable: null,
        unreliable: null,
        initialized: false,
      }
      clients.push(client)
      messages.set(client, [])
    }

    if (metadata.reliable) {
      client.reliable = connection
    } else {
      client.unreliable = connection
    }

    if (client.reliable && client.unreliable) {
      onClientConnect(client, world)
    }

    connection.closed.subscribe(() => onClientDisconnect(client, world))
    connection.messages.subscribe(data => {
      const message = decode(data) as Message
      const buffer = messages.get(client)!

      buffer.push(message)
    })
    connection.errors.subscribe(onConnectionError)
    connection.closed.subscribe(() => {
      clients.splice(clients.indexOf(client), 1)
    })
  }

  return {
    *[Symbol.iterator]() {
      for (let i = 0; i < clients.length; i++) {
        yield clients[i]
      }
    },
    *messages(client: NetEcsServerClient) {
      const buffer = messages.get(client)
      let message: Message

      while ((message = buffer.pop())) {
        yield message
      }
    },
    registerConnection,
  }
}
