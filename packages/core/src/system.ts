import { Entity } from "./entity"
import { EntityAdmin } from "./entity_admin"
import { Selector } from "./selector"

export type SystemQuery = Selector[][]

export type SystemQueryResult<Q extends SystemQuery = SystemQuery> = {
  [K in keyof Q]: Entity[]
}

export type System<Q extends SystemQuery = SystemQuery> = {
  name: string
  execute(world: EntityAdmin, ...queryResults: SystemQueryResult<Q>): void
  query: Q
}

export function createSystem<Q extends SystemQuery>(definition: {
  name: string
  query: Q
  execute: (world: EntityAdmin, ...queryResults: SystemQueryResult<Q>) => void
}): System<Q> {
  return definition
}
