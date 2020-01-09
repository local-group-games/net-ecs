import { ComponentFactory } from "./component";
import { Entity } from "./entity";
import { World } from "./world";

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
  update(world: World, queryResult: SystemQueryResult<Q>): void;
  query: Q;
};

export function createSystem<Q extends SystemQuery>(
  query: Q,
  update: (world: World, queryResult: SystemQueryResult<Q>) => void
): System<Q> {
  return { update, query };
}
