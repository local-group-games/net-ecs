import { decode, encode } from "@msgpack/msgpack"
import { Component } from "../component"
import { Entity } from "../entity"
import { Arguments } from "../types/util"
import { pipe } from "../util/fp"

export enum MessageType {
  // unreliable/unordered
  StateUpdate,
  // reliable/ordered
  EntitiesRemoved,
  ComponentRemoved,
}

export type Message<T extends MessageType, P> = [T, P]

export type StateUpdateMessage = Message<MessageType.StateUpdate, Component[]>
export type EntitiesRemovedMessage = Message<MessageType.EntitiesRemoved, Entity[]>
export type ComponentRemovedMessage = Message<MessageType.ComponentRemoved, (Entity | string)[]>

export type AnyMessage = StateUpdateMessage | EntitiesRemovedMessage | ComponentRemovedMessage

const helpers = {
  stateUpdate: (payload: Component[]): StateUpdateMessage => [MessageType.StateUpdate, payload],
  entitiesRemoved: (payload: Entity[]): EntitiesRemovedMessage => [
    MessageType.EntitiesRemoved,
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
