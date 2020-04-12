import { decode, encode } from "@msgpack/msgpack"
import { Component } from "../component"
import { Entity } from "../entity"

export enum MessageType {
  StateUpdate,
  EntitiesCreated,
  EntitiesDeleted,
  ComponentRemoved,
}

export type Message<T extends number = number, P = any> = [T, P, boolean]
export type CustomMessage<T extends number = number, P = any> = [T, P, false]

export type StateUpdateMessage = Message<
  MessageType.StateUpdate,
  (number | Component)[]
>
export type EntitiesCreatedMessage = Message<
  MessageType.EntitiesCreated,
  ReadonlyArray<Entity>
>
export type EntitiesDeletedMessage = Message<
  MessageType.EntitiesDeleted,
  ReadonlyArray<Entity>
>
export type ComponentRemovedMessage = Message<
  MessageType.ComponentRemoved,
  (Entity | string)[]
>

export function createMessageHelper<T extends number, A extends any[], P>(
  type: T,
  fn: (...args: A) => P,
): (...args: A) => Message<T, P> {
  return (...args: A) => [type, fn(...args), true]
}

export function createCustomMessageHelper<T extends number, A extends any[], P>(
  type: T,
  fn: (...args: A) => P,
): (...args: A) => CustomMessage<T, P> {
  return (...args: A) => [type, fn(...args), false]
}

export type MessageHelper<T extends number = number, P = any> = (
  ...args: any[]
) => Message<T, P>

export const protocol = {
  // Client

  // Server
  stateUpdate: createMessageHelper(
    MessageType.StateUpdate,
    (payload: Component[], clientMetadata: unknown) =>
      [payload, clientMetadata] as [Component[], unknown],
  ),
  entitiesCreated: createMessageHelper(
    MessageType.EntitiesCreated,
    (payload: ReadonlyArray<Entity | Component>) => payload,
  ),
  entitiesDeleted: createMessageHelper(
    MessageType.EntitiesDeleted,
    (payload: ReadonlyArray<Entity>) => payload,
  ),
  componentRemoved: createMessageHelper(
    MessageType.ComponentRemoved,
    (payload: (Entity | string)[]) => payload,
  ),
}

export type ExtractProtocolMessageTypes<
  T extends { [key: string]: MessageHelper }
> = {
  [K in keyof T]: ReturnType<T[K]>
}[keyof T]

export type NetEcsMessage = ExtractProtocolMessageTypes<typeof protocol>

export { encode, decode }
