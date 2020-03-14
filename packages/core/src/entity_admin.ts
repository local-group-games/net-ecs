import { Component, ComponentFactory, ComponentOf } from "./component"
import { createComponentAdmin } from "./component_admin"
import { Entity } from "./entity"
import * as Internal from "./internal"
import { Selector, SelectorType } from "./selector"
import { Signal } from "./signal"
import { System, SystemQueryResult } from "./system"
import { Clock } from "./types/clock"
import { FactoryArgs } from "./types/util"
import {
  contains,
  getComponentType,
  mutableRemove,
  mutableRemoveUnordered,
  viewEntityAdmin,
} from "./util"

export type EntityAdminConfig = {
  initialPoolSize: number
}

export type EntityAdminOptions = {
  [K in keyof EntityAdminConfig]?: EntityAdminConfig[K]
}

const defaultOptions: EntityAdminConfig = {
  initialPoolSize: 500,
}

enum EntityTag {
  Added,
  Deleted,
  Changed,
  ComponentsChanged,
}

const systemNotRegisteredError = new Error("System has not been registered.")
const systemAlreadyRegisteredError = new Error("System was already registered.")

export function createEntityAdmin(options: EntityAdminOptions = defaultOptions) {
  const config: EntityAdminConfig = Object.assign({}, defaultOptions, options)
  const clock: Clock = {
    step: -1,
    tick: -1,
    time: 0,
  }

  const ticked = new Signal<number, number>()
  const systems: System[] = []
  const entities: Entity[] = []
  const componentAdmin = createComponentAdmin(config.initialPoolSize)
  const queryState: { [systemName: string]: SystemQueryResult } = {}
  const entitiesByTag = {
    [EntityTag.Added]: new Set<Entity>(),
    [EntityTag.ComponentsChanged]: new Set<Entity>(),
    [EntityTag.Changed]: new Set<Entity>(),
    [EntityTag.Deleted]: new Set<Entity>(),
  }

  let entitySequence = 0

  function addSystem(system: System) {
    if (isSystemRegistered(system)) {
      throw systemAlreadyRegisteredError
    }

    systems.push(system)
    // Initialize a set of empty results for each query.
    queryState[system.name] = system.query.map(() => [])

    // Update the system query.
    entities.forEach(entity => updateQueryForEntity(system, entity))
  }

  function removeSystem(system: System) {
    if (!isSystemRegistered(system)) {
      throw systemNotRegisteredError
    }

    mutableRemove(systems, system)
    delete queryState[system.name]
  }

  function isSystemRegistered(system: System) {
    return systems.indexOf(system) > -1
  }

  function select(selector: Selector, entity: Entity) {
    let componentCheckPassed = true

    if (selector.componentType) {
      const components = tryGetComponent(entity, selector.componentType)
      componentCheckPassed = components !== null && components !== undefined
    }

    if (!componentCheckPassed) {
      return selector.selectorType === SelectorType.Without
    }

    switch (selector.selectorType) {
      case SelectorType.With:
        return true
      case SelectorType.Added:
        return entitiesByTag[EntityTag.Added].has(entity)
      case SelectorType.Removed:
        return entitiesByTag[EntityTag.Deleted].has(entity)
      case SelectorType.Changed:
        return entitiesByTag[EntityTag.Changed].has(entity)
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

      let j = 0

      while (isQueryHit && j < selectors.length) {
        const selector = selectors[j]

        if (!select(selector, entity)) {
          isQueryHit = false
        }

        j++
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

  function resetTags() {
    entitiesByTag[EntityTag.Added].clear()
    entitiesByTag[EntityTag.Deleted].clear()
    entitiesByTag[EntityTag.Changed].clear()
    entitiesByTag[EntityTag.ComponentsChanged].clear()
  }

  function processTags() {
    for (const entity of entitiesByTag[EntityTag.Added]) {
      updateAllQueriesForEntity(entity)
    }

    for (const entity of entitiesByTag[EntityTag.Deleted]) {
      componentAdmin.removeAllComponents(entity)
      updateAllQueriesForEntity(entity)
    }

    for (const entity of entitiesByTag[EntityTag.Changed]) {
      updateAllQueriesForEntity(entity)
    }

    for (const entity of entitiesByTag[EntityTag.ComponentsChanged]) {
      updateAllQueriesForEntity(entity)
    }
  }

  function tick(timeStep: number) {
    // Update queries for all changed entities.
    processTags()
    // Reset changed entities for next tick.
    resetTags()

    // Step the clock to the next frame and update the monotonic time.
    clock.step = timeStep
    clock.tick += 1
    clock.time += timeStep

    // Execute systems.
    for (let i = 0; i < systems.length; i++) {
      const system = systems[i]
      const result = queryState[system.name]

      if (result) {
        system.update(entityAdmin, ...result)
      }
    }
  }

  function hasEntity(entity: Entity) {
    return entities.indexOf(entity) > -1
  }

  function createEntity() {
    const entity = (entitySequence += 1)

    entities.push(entity)

    entitiesByTag[EntityTag.Added].add(entity)

    return entity
  }

  function destroyEntity(entity: Entity) {
    if (!entities.includes(entity)) {
      return
    }

    mutableRemoveUnordered(entities, entity)

    entitiesByTag[EntityTag.Deleted].add(entity)
    entitiesByTag[EntityTag.Changed].delete(entity)

    return entity
  }

  function addComponent<F extends ComponentFactory>(
    entity: Entity,
    factory: F,
    ...args: FactoryArgs<F>
  ) {
    if (entitiesByTag[EntityTag.Deleted].has(entity) || !entities.includes(entity)) {
      return false
    }

    entitiesByTag[EntityTag.ComponentsChanged].add(entity)

    return componentAdmin.addComponent(entity, factory, ...args)
  }

  function removeComponent(entity: Entity, identifier: ComponentFactory | Component | string) {
    const componentType = getComponentType(identifier)

    // No-op if the entity is being deleted.
    if (entitiesByTag[EntityTag.Deleted].has(entity)) {
      return false
    }

    componentAdmin.removeComponent(entity, componentType)
    entitiesByTag[EntityTag.ComponentsChanged].add(entity)
  }

  function getComponent<F extends ComponentFactory>(
    entity: Entity,
    identifier: F | string,
  ): Readonly<ComponentOf<F>> {
    const componentType = getComponentType(identifier)
    const component = componentAdmin.getComponent<F>(entity, componentType)

    return component
  }

  function getMutableComponent<F extends ComponentFactory>(
    entity: Entity,
    identifier: F | string,
  ): ComponentOf<F> {
    const component = getComponent(entity, identifier)

    entitiesByTag[EntityTag.Changed].add(entity)

    return component as ComponentOf<F>
  }

  function tryGetMutableComponent<F extends ComponentFactory>(
    entity: Entity,
    factory: F | string,
  ): ComponentOf<F> | null {
    try {
      return getMutableComponent(entity, factory)
    } catch {
      return null
    }
  }

  function tryGetComponent<F extends ComponentFactory>(
    entity: Entity,
    identify: F | string,
  ): Readonly<ComponentOf<F>> | null {
    try {
      return getComponent(entity, identify)
    } catch {
      return null
    }
  }

  function createSingletonComponent<C extends ComponentFactory>(
    factory: C,
    ...args: FactoryArgs<C>
  ) {
    const entity = createEntity()

    addComponent(entity, factory, ...args)
  }

  function view() {
    return viewEntityAdmin(entityAdmin)
  }

  const { createComponentInstance, insertComponent, registerComponentFactory } = componentAdmin

  const entityAdmin = {
    addSystem,
    removeSystem,
    isSystemRegistered,
    clock,
    tick,
    hasEntity,
    createEntity,
    destroyEntity,
    addComponent,
    insertComponent,
    removeComponent,
    getComponent,
    getMutableComponent,
    tryGetComponent,
    tryGetMutableComponent,
    createComponentInstance,
    createSingletonComponent,
    registerComponentFactory,
    view,
    // internal
    [Internal.INTERNAL_$entityAdminEntities]: entities,
    [Internal.INTERNAL_$entityAdminSystems]: systems,
    [Internal.INTERNAL_$entityAdminQueryState]: queryState,
    [Internal.INTERNAL_$entityAdminComponentAdmin]: componentAdmin,
  }

  Internal.INTERNAL_entityAdminAdded.dispatch(entityAdmin)

  return entityAdmin
}

export type EntityAdmin = ReturnType<typeof createEntityAdmin>
