import { decode, encode } from "@msgpack/msgpack"
import { Component } from "../component"
import { Entity } from "../entity"
import { Arguments } from "../types/util"
import { pipe } from "../util/fp"

export enum MessageType {
  StateUpdate,
  EntitiesCreated,
  EntitiesDestroyed,
  ComponentRemoved,
}

export type Message<T extends MessageType, P> = [T, P]

export type StateUpdateMessage = Message<MessageType.StateUpdate, Component[]>
export type EntitiesCreatedMessage = Message<MessageType.EntitiesCreated, ReadonlyArray<Entity>>
export type EntitiesDestroyedMessage = Message<MessageType.EntitiesDestroyed, ReadonlyArray<Entity>>
export type ComponentRemovedMessage = Message<MessageType.ComponentRemoved, (Entity | string)[]>

export type AnyMessage =
  | StateUpdateMessage
  | EntitiesCreatedMessage
  | EntitiesDestroyedMessage
  | ComponentRemovedMessage

const helpers = {
  stateUpdate: (payload: Component[]): StateUpdateMessage => [MessageType.StateUpdate, payload],
  entitiesCreated: (payload: ReadonlyArray<Entity>): EntitiesCreatedMessage => [
    MessageType.EntitiesCreated,
    payload,
  ],
  entitiesDestroyed: (payload: ReadonlyArray<Entity>): EntitiesDestroyedMessage => [
    MessageType.EntitiesDestroyed,
    payload,
  ],
  componentRemoved: (payload: (Entity | string)[]): ComponentRemovedMessage => [
    MessageType.ComponentRemoved,
    payload,
  ],
}

type Protocol = {
  [k in keyof typeof helpers]: (...args: Arguments<typeof helpers[k]>) => Uint8Array
}

export const protocol = Object.keys(helpers).reduce((p, key) => {
  const k = key as keyof typeof helpers
  p[k] = pipe(helpers[k], encode)
  return p
}, {} as Protocol)

export { decode }
