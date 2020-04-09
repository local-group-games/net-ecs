import { decode, encode } from "@msgpack/msgpack"
import { Component } from "../component"
import { Entity } from "../entity"

export enum MessageType {
  StateUpdate,
  EntitiesCreated,
  EntitiesDestroyed,
  ComponentRemoved,
}

export type Message<T extends number = number, P = any> = [T, P, boolean, number]
export type CustomMessage<T extends number = number, P = any> = [T, P, false, number]

export type StateUpdateMessage = Message<MessageType.StateUpdate, (number | Component)[]>
export type EntitiesCreatedMessage = Message<MessageType.EntitiesCreated, ReadonlyArray<Entity>>
export type EntitiesDestroyedMessage = Message<MessageType.EntitiesDestroyed, ReadonlyArray<Entity>>
export type ComponentRemovedMessage = Message<MessageType.ComponentRemoved, (Entity | string)[]>

export function createMessageHelper<T extends number, A extends any[], P>(
  type: T,
  fn: (...args: A) => P,
  lib?: true,
): (tick: number, ...args: A) => typeof lib extends boolean ? Message<T, P> : CustomMessage<T, P> {
  return (tick: number, ...args: A) => [type, fn(...args), lib === true ? lib : false, tick]
}

export type MessageHelper<T extends number = number, P = any> = (
  frame: number,
  ...args: any[]
) => Message<T, P>

export const protocol = {
  // Client

  // Server
  stateUpdate: createMessageHelper(
    MessageType.StateUpdate,
    (payload: Component[]) => payload,
    true,
  ),
  entitiesCreated: createMessageHelper(
    MessageType.EntitiesCreated,
    (payload: ReadonlyArray<Entity>) => payload,
    true,
  ),
  entitiesDestroyed: createMessageHelper(
    MessageType.EntitiesDestroyed,
    (payload: ReadonlyArray<Entity>) => payload,
    true,
  ),
  componentRemoved: createMessageHelper(
    MessageType.ComponentRemoved,
    (payload: (Entity | string)[]) => payload,
    true,
  ),
}

export type ExtractProtocolMessageTypes<T extends { [key: string]: MessageHelper }> = {
  [K in keyof T]: ReturnType<T[K]>
}[keyof T]

export type NetEcsMessage = ExtractProtocolMessageTypes<typeof protocol>

export { encode, decode }
