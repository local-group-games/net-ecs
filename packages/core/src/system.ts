import { ComponentFactory } from "./component";
import { Entity } from "./entity";
import { EntityAdmin } from "./entityAdmin";

export type ComponentSelector<
  F extends ComponentFactory = ComponentFactory
> = F[];

export type SystemQuery = {
  [queryName: string]: ComponentSelector;
};

export type SystemQueryResult<Q extends SystemQuery = SystemQuery> = {
  [K in keyof Q]: Entity[];
};

export type System<Q extends SystemQuery = SystemQuery> = {
  update(world: EntityAdmin, queryResult: SystemQueryResult<Q>): void;
  query: Q;
};

export function createSystem<Q extends SystemQuery>(
  query: Q,
  update: (world: EntityAdmin, queryResult: SystemQueryResult<Q>) => void
): System<Q> {
  return { update, query };
}
