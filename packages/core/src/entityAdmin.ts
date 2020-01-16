import { Component, ComponentFactory } from "./component"
import { createComponentAdmin } from "./componentAdmin"
import {
  $entity_admin_debug_component_admin,
  $entity_admin_debug_entities,
  $entity_admin_debug_systems,
  $entity_admin_debug_system_query_results,
} from "./debug"
import { Entity } from "./entity"
import { Selector, SelectorType } from "./selector"
import { System, SystemQueryResult } from "./system"
import { Clock } from "./types/clock"
import { GetFactoryArguments } from "./types/util"
import { contains, mutableRemove, mutableRemoveUnordered } from "./util"

enum EntityTag {
  Added,
  Deleted,
  Changed,
  ComponentsChanged,
}

type EntityAdminConfig = {
  initialPoolSize: number
}

type EntityAdminOptions = {
  [K in keyof EntityAdminConfig]?: EntityAdminConfig[K]
}

const defaultOptions: EntityAdminConfig = {
  initialPoolSize: 500,
}

export function createEntityAdmin(
  options: EntityAdminOptions = defaultOptions,
) {
  const config: EntityAdminConfig = Object.assign({}, defaultOptions, options)
  const clock: Clock = {
    step: -1,
    tick: -1,
    time: 0,
  }

  const entities = new Set<Entity>()
  const componentAdmin = createComponentAdmin(config.initialPoolSize)
  const systems: System[] = []
  const systemQueryResults = new WeakMap<System, SystemQueryResult>()
  const entitiesToUpdateNextTick = new Set<Entity>()
  const tags = {
    [EntityTag.Added]: new Set<Entity>(),
    [EntityTag.ComponentsChanged]: new Set<Entity>(),
    [EntityTag.Changed]: new Set<Entity>(),
    [EntityTag.Deleted]: new Set<Entity>(),
  }

  let entitySequence = 0

  function addSystem(system: System) {
    if (hasSystem(system)) {
      throw new Error(`System already registered`)
    }

    const results = system.query.map(() => [])

    systems.push(system)
    systemQueryResults.set(system, results)

    entities.forEach(entity => updateQueryForEntity(system, entity))
  }

  function removeSystem(system: System) {
    if (!hasSystem(system)) {
      return
    }
    mutableRemove(systems, system)
    systemQueryResults.delete(system)
  }

  function hasSystem(system: System) {
    return systems.indexOf(system) > -1
  }

  function select(selector: Selector, entity: Entity) {
    switch (selector.selectorType) {
      case SelectorType.Added:
        return tags[EntityTag.Added].has(entity)
      case SelectorType.Removed:
        return tags[EntityTag.Deleted].has(entity)
      case SelectorType.Changed:
        return tags[EntityTag.Changed].has(entity)
      case SelectorType.With:
      case SelectorType.Without: {
        const components = tryGetComponent(entity, selector.componentFactory)
        const hasComponents = components !== null && components !== undefined

        return selector.selectorType === SelectorType.With
          ? hasComponents
          : !hasComponents
      }
    }
  }

  function updateQueryForEntity(system: System, entity: Entity) {
    const { query } = system
    const results = systemQueryResults.get(system)!

    for (let i = 0; i < query.length; i++) {
      const selectors = system.query[i]
      const selectorResults = results[i]
      const isSelected = contains(selectorResults, entity)

      let isQueryHit = true

      for (let i = 0; i < selectors.length && isQueryHit; i++) {
        const selector = selectors[i]

        if (!select(selector, entity)) {
          isQueryHit = false
        }
      }

      if (isQueryHit && !isSelected) {
        selectorResults.push(entity)
      } else if (!isQueryHit && isSelected) {
        mutableRemoveUnordered(selectorResults, entity)
      }
    }
  }

  function updateAllQueriesForEntity(entity: Entity) {
    for (let i = 0; i < systems.length; i++) {
      const system = systems[i]

      updateQueryForEntity(system, entity)
    }
  }

  function processTags() {
    for (const entity of tags[EntityTag.Added]) {
      updateAllQueriesForEntity(entity)
      entitiesToUpdateNextTick.add(entity)
    }

    for (const entity of tags[EntityTag.Deleted]) {
      componentAdmin.clearEntityComponents(entity)
      updateAllQueriesForEntity(entity)
      entitiesToUpdateNextTick.add(entity)
    }

    for (const entity of tags[EntityTag.Changed]) {
      updateAllQueriesForEntity(entity)
      entitiesToUpdateNextTick.add(entity)
    }

    for (const entity of tags[EntityTag.ComponentsChanged]) {
      updateAllQueriesForEntity(entity)
    }

    tags[EntityTag.Added].clear()
    tags[EntityTag.Deleted].clear()
    tags[EntityTag.Changed].clear()
    tags[EntityTag.ComponentsChanged].clear()
  }

  function tick(timeStep: number) {
    processTags()

    clock.step = timeStep
    clock.tick += 1
    clock.time += timeStep

    for (let i = 0; i < systems.length; i++) {
      const system = systems[i]
      const result = systemQueryResults.get(system)

      if (result) {
        system.update(world, ...result)
      }
    }

    for (const entity of entitiesToUpdateNextTick) {
      updateAllQueriesForEntity(entity)
    }

    entitiesToUpdateNextTick.clear()
  }

  function createEntity() {
    const entity = (entitySequence += 1)

    entities.add(entity)

    tags[EntityTag.Added].add(entity)

    return entity
  }

  function destroyEntity(entity: Entity) {
    entities.delete(entity)

    tags[EntityTag.Deleted].add(entity)
    tags[EntityTag.Changed].delete(entity)

    return entity
  }

  function addComponentToEntity<C extends ComponentFactory | Component>(
    entity: Entity,
    componentOrFactory: C,
    ...args: C extends ComponentFactory ? GetFactoryArguments<C> : never[]
  ) {
    if (tags[EntityTag.Deleted].has(entity) || !entities.has(entity)) {
      return false
    }

    tags[EntityTag.ComponentsChanged].add(entity)

    return componentAdmin.addComponentToEntity(
      entity,
      componentOrFactory,
      ...args,
    )
  }

  function removeComponentFromEntity(
    entity: Entity,
    component: Component | ComponentFactory,
  ) {
    if (tags[EntityTag.Deleted].has(entity) || !entities.has(entity)) {
      return false
    }

    const result = componentAdmin.removeComponentFromEntity(entity, component)

    if (result) {
      tags[EntityTag.ComponentsChanged].add(entity)
    }

    return result
  }

  function getMutableComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    const component = componentAdmin.getComponent(entity, componentFactory)

    tags[EntityTag.Changed].add(entity)

    return component
  }

  function tryGetMutableComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    try {
      return getMutableComponent(entity, componentFactory)
    } catch {
      return null
    }
  }

  function tryGetComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    try {
      return componentAdmin.getComponent(entity, componentFactory)
    } catch {
      return null
    }
  }

  const world = {
    addSystem,
    removeSystem,
    hasSystem,
    clock,
    tick,
    createEntity,
    destroyEntity,
    addComponentToEntity,
    removeComponentFromEntity,
    getComponent: componentAdmin.getComponent,
    getMutableComponent,
    tryGetComponent,
    tryGetMutableComponent,
    createComponentInstance: componentAdmin.createComponentInstance,
    // debug
    [$entity_admin_debug_entities]: entities,
    [$entity_admin_debug_systems]: systems,
    [$entity_admin_debug_system_query_results]: systemQueryResults,
    [$entity_admin_debug_component_admin]: componentAdmin,
  }

  return world
}

export type EntityAdmin = ReturnType<typeof createEntityAdmin>
