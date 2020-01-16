import { Entity } from "./entity"
import { EntityAdmin } from "./entityAdmin"
import { Selector } from "./selector"

export type SystemQuery = Selector[][]

export type SystemQueryResult<Q extends SystemQuery = SystemQuery> = {
  [K in keyof Q]: Entity[]
}

export type System<Q extends SystemQuery = SystemQuery> = {
  update(world: EntityAdmin, ...queryResults: SystemQueryResult<Q>): void
  query: Q
}

export function createSystem<Q extends SystemQuery>(
  update: (world: EntityAdmin, ...queryResults: SystemQueryResult<Q>) => void,
  ...query: Q
): System<Q> {
  return { update, query }
}
