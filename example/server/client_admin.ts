import { decode, Message } from "@net-ecs/net"
import { Connection, ServerClient } from "./types"

export type ClientAdmin = {
  [Symbol.iterator]: () => Generator<ServerClient>
  handleConnection(connection: Connection): void
}

export type ClientAdminOptions = {
  onConnectionError: (event: { error: string }) => void
  onClientConnect: (client: ServerClient) => void
  onClientDisconnect: (client: ServerClient) => void
  onClientMessage: (client: ServerClient, message: Message) => void
}

export function createClientAdmin(options: ClientAdminOptions): ClientAdmin {
  const {
    onClientConnect,
    onConnectionError,
    onClientDisconnect,
    onClientMessage,
  } = options
  const connecting: ServerClient[] = []
  const clients: ServerClient[] = []

  function registerConnection(connection: Connection) {
    const { metadata } = connection

    if (!metadata.sessionId) {
      throw new Error("sessionId not provided.")
    }

    let client = connecting.find(
      client => client.sessionId === metadata.sessionId,
    )

    if (!client) {
      client = {
        sessionId: metadata.sessionId,
        reliable: null,
        unreliable: null,
        initialized: false,
      }
      connecting.push(client)
    }

    connection.messages.subscribe(data =>
      onClientMessage(client, decode(data) as Message),
    )
    connection.errors.subscribe(onConnectionError)
    connection.closed.subscribe(() => {
      if (!clients.includes(client)) {
        // Client already removed.
        return
      }
      onClientDisconnect(client)
      clients.splice(clients.indexOf(client), 1)
    })

    if (metadata.reliable) {
      client.reliable = connection
    } else {
      client.unreliable = connection
    }

    if (client.reliable && client.unreliable) {
      onClientConnect(client)
      connecting.splice(connecting.indexOf(client), 1)
      clients.push(client)
    }
  }

  return {
    *[Symbol.iterator]() {
      for (let i = 0; i < clients.length; i++) {
        yield clients[i]
      }
    },
    handleConnection: registerConnection,
  }
}
