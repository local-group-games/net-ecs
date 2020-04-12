import {
  createCustomMessageHelper,
  Entity,
  ExtractProtocolMessageTypes,
  CustomMessage,
} from "@net-ecs/core"
import { InputData } from "../types"

export enum ExampleMessageType {
  // client
  Move,
  ClientEntity,
  // server
  ServerInfo,
}

export const protocol = {
  // Client
  move: createCustomMessageHelper(
    ExampleMessageType.Move,
    (input: InputData) => input,
  ),

  // Server
  serverInfo: createCustomMessageHelper(
    ExampleMessageType.ServerInfo,
    (tickRate: number, sendRate: number) => ({ tickRate, sendRate }),
  ),
  clientEntity: createCustomMessageHelper(
    ExampleMessageType.ClientEntity,
    (entity: Entity) => entity,
  ),
}

export type ExampleMessage = ExtractProtocolMessageTypes<typeof protocol>
