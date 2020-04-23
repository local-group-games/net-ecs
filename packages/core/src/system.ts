import { Entity } from "./entity"
import { EntityAdmin } from "./entity_admin"
import { ComponentType } from "./component"

export type SystemQuery = ComponentType[]

export type SystemQueryResult<Q extends SystemQuery = SystemQuery> = {
  [K in keyof Q]: Entity[]
}

export type System<Q extends SystemQuery = SystemQuery> = {
  name: string
  execute(world: EntityAdmin, ...results: SystemQueryResult<Q>): void
  query: Q
}

export function createSystem<Q extends SystemQuery>(definition: {
  name: string
  query: Q
  execute: (world: EntityAdmin, ...results: SystemQueryResult<Q>) => void
}): System<Q> {
  return definition
}
