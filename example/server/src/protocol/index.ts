import { createMessageHelper, Entity, ExtractProtocolMessageTypes } from "@net-ecs/core"
import { InputData } from "../types"

export enum ExampleMessageType {
  Move,
  ClientEntity,
}

export const protocol = {
  // Client
  move: createMessageHelper(ExampleMessageType.Move, (input: InputData) => input),

  // Server
  clientEntity: createMessageHelper(ExampleMessageType.ClientEntity, (entity: Entity) => entity),
}

export type ExampleMessage = ExtractProtocolMessageTypes<typeof protocol>
