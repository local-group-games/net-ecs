import { Component, ComponentFactory, ComponentOfFactory } from "./component";
import { Entity } from "./entity";
import { System, SystemQueryResult } from "./system";
import { Clock } from "./types/clock";
import { contains, mutableRemove, mutableRemoveUnordered } from "./util";

export interface World {
  clock: Clock;
  tick(timeStep: number): void;
  createEntity(entity: Entity, components: Component[]): Entity;
  destroyEntity(entity: Entity): Entity;
  addComponentToEntity(entity: Entity, component: Component): Entity;
  removeComponentFromEntity(entity: Entity, component: Component): Entity;
  getComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F
  ): ComponentOfFactory<F>;
  tryGetComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F
  ): ComponentOfFactory<F> | null;
}

function buildSingleSystemQueryResult(system: System) {
  const entries = Object.entries(system.query);

  return entries.reduce((results, [queryName]) => {
    results[queryName] = [];
    return results;
  }, {} as SystemQueryResult);
}

function buildSystemQueryResults(systems: System[]) {
  return new Map<System, SystemQueryResult>(
    systems.map(system => [system, buildSingleSystemQueryResult(system)])
  );
}

export function createWorld(systems: System[]): World {
  const clock: Clock = {
    step: -1,
    tick: -1,
    time: 0
  };
  const componentsByEntity = new Map<number, Component[]>();
  const queryResultsBySystem = buildSystemQueryResults(systems);
  const updated = new Set<number>();
  const deleted = new Set<number>();

  function updateQueriesForChangedEntity(entity: Entity) {
    const components = componentsByEntity.get(entity);

    for (let i = 0; i < systems.length; i++) {
      const system = systems[i];
      const systemQueryResults = queryResultsBySystem.get(
        system
      ) as SystemQueryResult;

      for (const queryName in system.query) {
        const selector = system.query[queryName];
        const selectorResults = systemQueryResults[queryName];
        const isSelected = contains(selectorResults, entity);

        if (components) {
          const hit = selector.every(factory =>
            components.find(component => component.$type === factory.$type)
          );

          if (hit && !isSelected) {
            selectorResults.push(entity);
            continue;
          }
        }

        if (isSelected) {
          mutableRemoveUnordered(selectorResults, entity);
        }
      }
    }
  }

  function tick(timeStep: number) {
    clock.step = timeStep;
    clock.tick += 1;
    clock.time += timeStep;

    for (let i = 0; i < systems.length; i++) {
      const system = systems[i];
      const result = queryResultsBySystem.get(system);

      if (result) {
        system.update(world, result);
      }
    }

    updated.forEach(updateQueriesForChangedEntity);
    deleted.forEach(entity => {
      componentsByEntity.delete(entity);
      updateQueriesForChangedEntity(entity);
    });
    updated.clear();
    deleted.clear();
  }

  function createEntity(entity: Entity, components: Component[]) {
    componentsByEntity.set(entity, components);
    updated.add(entity);

    return entity;
  }

  function destroyEntity(entity: Entity) {
    deleted.add(entity);

    return entity;
  }

  function addComponentToEntity(entity: Entity, toAdd: Component) {
    const components = componentsByEntity.get(entity);

    if (!components) {
      throw new Error(
        `Attempted to add component ${toAdd.$type} to unregistered entity ${entity}.`
      );
    }

    if (!contains(components, toAdd)) {
      components.push(toAdd);
      updated.add(entity);
    }

    return entity;
  }

  function removeComponentFromEntity(entity: Entity, toRemove: Component) {
    const components = componentsByEntity.get(entity);

    if (!components) {
      throw new Error(
        `Attempted to add component ${toRemove.$type} to unregistered entity ${entity}.`
      );
    }

    const removed = mutableRemove(components, toRemove);

    if (removed) {
      updated.add(entity);
    }

    return entity;
  }

  function getComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F
  ) {
    const components = componentsByEntity.get(entity);

    if (!components) {
      throw new Error(
        `Tried to get component ${componentFactory.$type} to unregistered entity ${entity}.`
      );
    }

    const { $type } = componentFactory;

    for (let i = 0; i < components.length; i++) {
      const component = components[i];

      if (component.$type === $type) {
        return component as ComponentOfFactory<F>;
      }
    }

    throw new Error(`Component not found on entity ${entity}.`);
  }

  function tryGetComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F
  ) {
    try {
      return getComponent(entity, componentFactory);
    } catch {
      return null;
    }
  }

  const world = {
    clock,
    tick,
    createEntity,
    destroyEntity,
    addComponentToEntity,
    removeComponentFromEntity,
    getComponent,
    tryGetComponent
  };

  return world;
}
