import { decode, encode } from "@msgpack/msgpack"
import { Component, Entity, Storage } from "@net-ecs/ecs"

export enum MessageType {
  StateUpdate,
  EntitiesCreated,
  EntitiesDeleted,
  ComponentRemoved,
}

export type Message<T extends number = number, P = any> = [T, P, boolean]
export type CustomMessage<T extends number = number, P = any> = [T, P, false]

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
    (payload: Component[][]) => payload,
  ),
  entitiesDeleted: createMessageHelper(
    MessageType.EntitiesDeleted,
    (payload: Entity[]) => payload,
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
