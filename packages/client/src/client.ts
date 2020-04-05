import {
  AnyMessage,
  Component,
  createEntityAdmin,
  decode,
  Entity,
  MessageType,
  EntityAdminOptions,
  EntityAdmin,
} from "@net-ecs/core"
import { Client, Connection } from "@web-udp/client"
import { SESSION_ID } from "./const"
import { ComponentUpdater } from "./types"

function merge(...objects: object[]) {
  return objects.reduce(Object.assign)
}

const attemptedToRemoveNonExistentEntityError = new Error(
  "Attempted to remove non-existent entity.",
)

export type NetEcsClientOptions = {
  url: string
  updaters?: { [componentType: string]: ComponentUpdater<any> }
  world?: EntityAdminOptions
}

function defaultUpdater(world: EntityAdmin, a: object, b: object) {
  return merge(a, b)
}

export function createNetEcsClient(options: NetEcsClientOptions) {
  const udp = new Client({ url: options.url })
  const world = createEntityAdmin(options.world)
  const remoteToLocal = new Map<Entity, Entity>()
  const { updaters = {} } = options

  let reliable: Connection | null = null
  let unreliable: Connection | null = null

  function handleStateUpdate(changed: Component[]) {
    for (let i = 0; i < changed.length; i++) {
      const remoteComponent = changed[i]
      const updater = updaters[remoteComponent.name] || merge
      const localEntity = remoteToLocal.get(remoteComponent.entity)

      // May have not recieved an EntityCreatedMessage yet.
      if (localEntity) {
        const localComponent = world.tryGetMutableComponentByType(localEntity, remoteComponent.name)

        if (localComponent) {
          updater(world, localComponent, remoteComponent)
        } else {
          world.insertComponent(localEntity, remoteComponent)
        }
      }
    }
  }

  function handleEntitiesCreated(entities: ReadonlyArray<Entity>) {
    for (let i = 0; i < entities.length; i++) {
      const remoteEntity = entities[i]
      const localEntity = world.createEntity()

      remoteToLocal.set(remoteEntity, localEntity)
    }
  }

  function handleEntitiesDestroyed(removed: ReadonlyArray<Entity>) {
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

  function onMessage(data: ArrayBuffer, source: Connection) {
    const message = decode(data) as AnyMessage

    switch (message[0]) {
      case MessageType.StateUpdate:
        handleStateUpdate(message[1])
        break
      case MessageType.EntitiesCreated:
        handleEntitiesCreated(message[1])
        break
      case MessageType.EntitiesDestroyed:
        handleEntitiesDestroyed(message[1])
        break
      case MessageType.ComponentRemoved:
        // handleComponentRemoved(...message[1])
        break
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

  async function initialize() {
    const sessionId = sessionStorage.getItem(SESSION_ID) ?? Math.random().toString()

    reliable = await udp.connect({
      binaryType: "arraybuffer",
      UNSAFE_ordered: true,
      metadata: { sessionId, reliable: true },
    })
    unreliable = await udp.connect({
      binaryType: "arraybuffer",
      metadata: { sessionId, reliable: false },
    })

    reliable.messages.subscribe(message => onMessage(message, reliable))
    unreliable.messages.subscribe(message => onMessage(message, unreliable))

    reliable.closed.subscribe(destroy)
    unreliable.closed.subscribe(destroy)

    sessionStorage.setItem(SESSION_ID, sessionId)
  }

  return {
    initialize,
    destroy,
    world,
  }
}
