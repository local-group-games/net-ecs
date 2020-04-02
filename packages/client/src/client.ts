import {
  AnyMessage,
  Component,
  createEntityAdmin,
  decode,
  Entity,
  MessageType,
  pipe,
} from "@net-ecs/core"
import { Client, Connection } from "@web-udp/client"
import { Signal } from "@web-udp/protocol"
import { SESSION_ID } from "./const"
import { ComponentUpdater } from "./types"

function merge(...objects: object[]) {
  return objects.reduce(Object.assign)
}

const attemptedToRemoveNonExistentEntityError = new Error(
  "Attempted to remove non-existent entity.",
)

export function createNetEcsClient(
  url: string,
  updaters: { [type: string]: ComponentUpdater<any> },
) {
  const udp = new Client({ url })
  const world = createEntityAdmin()
  const remoteToLocal = new Map<Entity, Entity>()

  let reliable: Connection | null = null
  let unreliable: Connection | null = null
  let messages = new Signal<AnyMessage>()

  function handleStateUpdate(update: Component[]) {
    for (let i = 0; i < update.length; i++) {
      const remoteComponent = update[i]
      const remoteEntity = remoteComponent.entity
      const updater = updaters[remoteComponent.type] || merge

      let localEntity = remoteToLocal.get(remoteComponent.entity)

      if (!localEntity) {
        localEntity = world.createEntity()
        remoteToLocal.set(remoteEntity, localEntity)
      }

      if (localEntity) {
        const localComponent = world.tryGetMutableComponent(localEntity, remoteComponent.type)

        if (localComponent) {
          updater(localComponent, remoteComponent)
        } else {
          world.insertComponent(localEntity, remoteComponent)
        }
      }
    }
  }

  function handleEntitiesRemoved(entities: Entity[]) {
    for (let i = 0; i < entities.length; i++) {
      const remoteEntity = entities[i]
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
    const message = decode(data) as AnyMessage

    switch (message[0]) {
      case MessageType.StateUpdate:
        handleStateUpdate(message[1])
        break
      case MessageType.EntitiesRemoved:
        handleEntitiesRemoved(message[1])
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

    reliable.messages.subscribe(onMessage)
    unreliable.messages.subscribe(onMessage)

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
