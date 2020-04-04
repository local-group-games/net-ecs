import { Connection, NetEcsServerClient } from "./types"

export interface NetEcsClientAdmin {
  [Symbol.iterator]: () => Generator<NetEcsServerClient>
  registerConnection(connection: Connection): void
}

export function createClientAdmin(
  onConnectionError: (event: { error: string }) => any,
): NetEcsClientAdmin {
  const clients: NetEcsServerClient[] = []

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
    }

    if (metadata.reliable) {
      client.reliable = connection
    } else {
      client.unreliable = connection
    }

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
    registerConnection,
  }
}
