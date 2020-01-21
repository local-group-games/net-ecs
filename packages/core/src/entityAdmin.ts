import { Component, ComponentFactory } from "./component"
import { createComponentAdmin } from "./componentAdmin"
import {
  debug_$entityAdminComponentAdmin,
  debug_$entityAdminEntities,
  debug_$entityAdminQueryState,
  debug_$entityAdminSystems,
  debug_entityAdminAdded,
} from "./debug"
import { Entity } from "./entity"
import { Selector, SelectorType } from "./selector"
import { System, SystemQueryResult } from "./system"
import { Clock } from "./types/clock"
import { GetFactoryArguments } from "./types/util"
import {
  contains,
  mutableRemove,
  mutableRemoveUnordered,
  viewEntityAdmin,
} from "./util"

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

  const systems: System[] = []
  const entities: Entity[] = []
  const componentAdmin = createComponentAdmin(config.initialPoolSize)
  const queryState: { [systemName: string]: SystemQueryResult } = {}
  const entitiesToUpdateNextTick = new Set<Entity>()
  const entityTags = {
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
    queryState[system.name] = results

    entities.forEach(entity => updateQueryForEntity(system, entity))
  }

  function removeSystem(system: System) {
    if (!hasSystem(system)) {
      return
    }
    mutableRemove(systems, system)
    delete queryState[system.name]
  }

  function hasSystem(system: System) {
    return systems.indexOf(system) > -1
  }

  function select(selector: Selector, entity: Entity) {
    switch (selector.selectorType) {
      case SelectorType.Added:
        return entityTags[EntityTag.Added].has(entity)
      case SelectorType.Removed:
        return entityTags[EntityTag.Deleted].has(entity)
      case SelectorType.Changed:
        return entityTags[EntityTag.Changed].has(entity)
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
    const results = queryState[system.name]

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
    for (const entity of entityTags[EntityTag.Added]) {
      updateAllQueriesForEntity(entity)
      entitiesToUpdateNextTick.add(entity)
    }

    for (const entity of entityTags[EntityTag.Deleted]) {
      componentAdmin.clearComponents(entity)
      updateAllQueriesForEntity(entity)
      entitiesToUpdateNextTick.add(entity)
    }

    for (const entity of entityTags[EntityTag.Changed]) {
      updateAllQueriesForEntity(entity)
      entitiesToUpdateNextTick.add(entity)
    }

    for (const entity of entityTags[EntityTag.ComponentsChanged]) {
      updateAllQueriesForEntity(entity)
    }

    entityTags[EntityTag.Added].clear()
    entityTags[EntityTag.Deleted].clear()
    entityTags[EntityTag.Changed].clear()
    entityTags[EntityTag.ComponentsChanged].clear()
  }

  function tick(timeStep: number) {
    processTags()

    clock.step = timeStep
    clock.tick += 1
    clock.time += timeStep

    for (let i = 0; i < systems.length; i++) {
      const system = systems[i]
      const result = queryState[system.name]

      if (result) {
        system.update(entityAdmin, ...result)
      }
    }

    for (const entity of entitiesToUpdateNextTick) {
      updateAllQueriesForEntity(entity)
    }

    entitiesToUpdateNextTick.clear()
  }

  function createEntity() {
    const entity = (entitySequence += 1)

    entities.push(entity)

    entityTags[EntityTag.Added].add(entity)

    return entity
  }

  function destroyEntity(entity: Entity) {
    if (!entities.includes(entity)) {
      return
    }

    mutableRemoveUnordered(entities, entity)

    entityTags[EntityTag.Deleted].add(entity)
    entityTags[EntityTag.Changed].delete(entity)

    return entity
  }

  function addComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
    ...args: GetFactoryArguments<F>
  ) {
    if (
      entityTags[EntityTag.Deleted].has(entity) ||
      !entities.includes(entity)
    ) {
      return false
    }

    entityTags[EntityTag.ComponentsChanged].add(entity)

    return componentAdmin.addComponent(entity, componentFactory, ...args)
  }

  function removeComponent(
    entity: Entity,
    component: Component | ComponentFactory,
  ) {
    if (
      entityTags[EntityTag.Deleted].has(entity) ||
      !entities.includes(entity)
    ) {
      return false
    }

    const result = componentAdmin.removeComponent(entity, component)

    if (result) {
      entityTags[EntityTag.ComponentsChanged].add(entity)
    }

    return result
  }

  function getMutableComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    const component = componentAdmin.getComponent(entity, componentFactory)

    entityTags[EntityTag.Changed].add(entity)

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

  function createSingletonComponent<C extends ComponentFactory>(
    componentFactory: C,
    ...args: GetFactoryArguments<C>
  ) {
    const entity = createEntity()

    addComponent(entity, componentFactory, ...args)
  }

  function view() {
    return viewEntityAdmin(entityAdmin)
  }

  const entityAdmin = {
    addSystem,
    removeSystem,
    hasSystem,
    clock,
    tick,
    createEntity,
    destroyEntity,
    addComponent,
    removeComponent,
    getComponent: componentAdmin.getComponent,
    getMutableComponent,
    tryGetComponent,
    tryGetMutableComponent,
    createComponentInstance: componentAdmin.createComponentInstance,
    createSingletonComponent,
    view,
    // debug
    [debug_$entityAdminEntities]: entities,
    [debug_$entityAdminSystems]: systems,
    [debug_$entityAdminQueryState]: queryState,
    [debug_$entityAdminComponentAdmin]: componentAdmin,
  }

  debug_entityAdminAdded.dispatch(entityAdmin)

  return entityAdmin
}

export type EntityAdmin = ReturnType<typeof createEntityAdmin>
