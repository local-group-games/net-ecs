import {
  CustomMessage,
  Component,
  createEntityAdmin,
  decode,
  encode,
  Entity,
  EntityAdmin,
  EntityAdminOptions,
  Message,
  MessageType,
  noop,
  createSystem,
  With,
} from "@net-ecs/core"
import { Client as UdpClient, Connection, Client } from "@web-udp/client"
import { SESSION_ID } from "./const"
import { ComponentUpdater } from "./types"
import { ServerInfo } from "./components"

function merge(...objects: object[]) {
  return objects.reduce(Object.assign)
}

const attemptedToRemoveNonExistentEntityError = new Error(
  "Attempted to remove non-existent entity.",
)

export type NetEcsClientOptions<M extends CustomMessage> = {
  url: string
  updaters?: { [componentType: string]: ComponentUpdater<any> }
  world?: EntityAdminOptions
  network: {
    onStateUpdate?(
      components: ReadonlyArray<Component>,
      client: NetEcsClient,
    ): void
    onServerMessage?(message: M, client: NetEcsClient): void
    onEntitiesCreated?(
      entities: ReadonlyArray<Entity>,
      client: NetEcsClient,
    ): void
  }
}

function defaultUpdater(world: EntityAdmin, a: object, b: object) {
  return merge(a, b)
}

export function createNetEcsClient<M extends CustomMessage>(
  options: NetEcsClientOptions<M>,
) {
  const {
    url,
    network: {
      onStateUpdate = noop,
      onServerMessage = noop,
      onEntitiesCreated = noop,
    },
  } = options
  const udp = new UdpClient({ url })
  const serverInfo = createSystem({
    name: "server_info",
    query: [[With(ServerInfo)]],
    execute(world, [entity]) {
      const serverInfo = world.getComponent(entity, ServerInfo)

      serverInfo.lastRegisteredClientTick = client.lastFrameProcessedByServer
    },
  })
  const world = createEntityAdmin({
    ...options.world,
    componentTypes: [ServerInfo, ...options.world?.componentTypes],
    systems: [serverInfo, ...options.world?.systems],
  })
  const remoteToLocal = new Map<Entity, Entity>()
  const { updaters = {} } = options

  world.createSingletonComponent(ServerInfo)

  let lastFrameProcessedByServer = 0
  let reliable: Connection | null = null
  let unreliable: Connection | null = null

  function handleStateUpdate(changed: Component[]) {
    for (let i = 0; i < changed.length; i++) {
      const remoteComponent = changed[i]
      const updater = updaters[remoteComponent.name] || defaultUpdater
      const localEntity = remoteToLocal.get(remoteComponent.entity)

      // May have not recieved an EntityCreatedMessage yet.
      if (localEntity) {
        const localComponent = world.tryGetMutableComponentByType(
          localEntity,
          remoteComponent.name,
        )

        if (localComponent) {
          updater(world, localComponent, remoteComponent)
        } else {
          world.insertComponent(localEntity, remoteComponent)
        }
      }
    }

    onStateUpdate(changed, client)
  }

  function handleEntitiesCreated(entries: ReadonlyArray<Entity | Component>) {
    const entities: Entity[] = []
    let entity: Entity

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]

      if (typeof entry === "number") {
        entity = world.createEntity()
        entities.push(entity)
        remoteToLocal.set(entry, entity)
      } else {
        world.insertComponent(entity, entry)
      }
    }

    onEntitiesCreated(entities, client)
  }

  function handleEntitiesDeleted(removed: ReadonlyArray<Entity>) {
    for (let i = 0; i < removed.length; i++) {
      const remoteEntity = removed[i]
      const localEntity = remoteToLocal.get(remoteEntity)

      if (!localEntity) {
        throw attemptedToRemoveNonExistentEntityError
      }

      world.destroyEntity(localEntity)
      remoteToLocal.delete(remoteEntity)
    }
  }

  function handleComponentRemoved(entity: Entity, type: string) {
    const localEntity = remoteToLocal.get(entity)

    if (localEntity) {
      world.removeComponent(localEntity, type)
    }
  }

  function onMessage(data: ArrayBuffer) {
    const message = decode(data) as Message
    const [, , lib, tick] = message

    if (tick > lastFrameProcessedByServer) {
      lastFrameProcessedByServer = tick
    }

    if (lib) {
      switch (message[0]) {
        case MessageType.StateUpdate:
          handleStateUpdate(message[1])
          break
        case MessageType.EntitiesCreated:
          handleEntitiesCreated(message[1])
          break
        case MessageType.EntitiesDeleted:
          handleEntitiesDeleted(message[1])
          break
        case MessageType.ComponentRemoved:
          // handleComponentRemoved(...message[1])
          break
      }
    } else {
      onServerMessage(message as M, client)
    }
  }

  async function destroy() {
    if (unreliable) {
      unreliable.close()
      unreliable = null
    }

    if (reliable) {
      reliable.close()
      reliable = null
    }
  }

  function sendReliable(message: CustomMessage) {
    if (!reliable) {
      return false
    }

    reliable.send(encode(message))
  }

  function sendUnreliable(message: CustomMessage) {
    if (!unreliable) {
      return false
    }

    unreliable.send(encode(message))
  }

  async function initialize() {
    const sessionId =
      sessionStorage.getItem(SESSION_ID) ?? Math.random().toString()

    reliable = await udp.connect({
      binaryType: "arraybuffer",
      UNSAFE_ordered: true,
      metadata: { sessionId, reliable: true },
    })
    unreliable = await udp.connect({
      binaryType: "arraybuffer",
      metadata: { sessionId, reliable: false },
    })

    reliable.messages.subscribe(onMessage)
    unreliable.messages.subscribe(onMessage)

    reliable.closed.subscribe(destroy)
    unreliable.closed.subscribe(destroy)

    sessionStorage.setItem(SESSION_ID, sessionId)
  }

  const client = {
    remoteToLocal,
    initialize,
    destroy,
    world,
    sendReliable,
    sendUnreliable,
    get lastFrameProcessedByServer() {
      return lastFrameProcessedByServer
    },
  }

  return client
}

export type NetEcsClient = ReturnType<typeof createNetEcsClient>
