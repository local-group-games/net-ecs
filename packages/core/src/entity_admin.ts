import { Component, ComponentOf, ComponentType } from "./component"
import { createComponentAdmin } from "./component_admin"
import { Entity } from "./entity"
import { EntityTag } from "./entity_tag"
import { createEntityTagAdmin } from "./entity_tag_admin"
import * as Internal from "./internal"
import { Selector } from "./selector"
import { System, SystemQueryResult } from "./system"
import { Clock } from "./types/clock"
import { ComponentTypeInitializerArgs } from "./types/util"
import {
  getComponentTypeName,
  mutableEmpty,
  mutableRemove,
  mutableRemoveUnordered,
  viewEntityAdmin,
} from "./util"
import { Signal } from "./signal"

export type EntityAdminConfig = {
  initialPoolSize: number
  systems: System[]
  componentTypes: ComponentType[]
}

export type EntityAdminOptions = {
  [K in keyof EntityAdminConfig]?: EntityAdminConfig[K]
}

const defaultOptions: EntityAdminConfig = {
  initialPoolSize: 500,
  systems: [],
  componentTypes: [],
}

const systemNotRegisteredError = new Error("System has not been registered.")
const systemAlreadyRegisteredError = new Error("System was already registered.")

export function createEntityAdmin(
  options: EntityAdminOptions = defaultOptions,
) {
  const config: EntityAdminConfig = Object.assign({}, defaultOptions, options)
  const clock: Clock = {
    step: -1,
    tick: -1,
    time: 0,
  }
  const signals = {
    tickStarted: new Signal<void>(),
  }
  const systems: System[] = []
  const entities: Entity[] = []
  const components = createComponentAdmin(config.initialPoolSize)
  const queries: { [systemName: string]: SystemQueryResult } = {}
  const tags = createEntityTagAdmin()
  const changedComponents = new Set<Component>()
  const changedEntities: Entity[] = []

  let entitySequence = 0

  function addSystem(system: System) {
    if (isSystemRegistered(system)) {
      throw systemAlreadyRegisteredError
    }

    systems.push(system)
    // Initialize a set of empty results for each query.
    queries[system.name] = system.query.map(() => [])

    // Update the system query.
    entities.forEach(entity => updateQueryForEntity(system, entity))
  }

  function removeSystem(system: System) {
    if (!isSystemRegistered(system)) {
      throw systemNotRegisteredError
    }

    mutableRemove(systems, system)
    delete queries[system.name]
  }

  function isSystemRegistered(system: System) {
    return systems.includes(system)
  }

  function updateQueryForEntity(system: System, entity: Entity) {
    const { query } = system
    const results = queries[system.name]

    for (let i = 0; i < query.length; i++) {
      const selectors = system.query[i]
      const selectorResults = results[i]
      const isSelected = selectorResults.includes(entity)

      let isQueryHit = true
      let j = 0

      while (isQueryHit && j < selectors.length) {
        const { componentType, tag } = selectors[j]
        const component = tryGetComponent(entity, componentType)

        if (component === null || component === undefined) {
          isQueryHit = tag === EntityTag.Without
        } else if (tag !== EntityTag.With) {
          if (!tags.has(entity, tag)) {
            isQueryHit = false
          } else if (tag === EntityTag.Changed) {
            isQueryHit = changedComponents.has(component)
          }
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

  function tick(timeStep: number) {
    signals.tickStarted.dispatch()

    // Release deleted entities' components before updating their queries.
    for (const entity of tags[EntityTag.Deleted]) {
      components.removeAllComponents(entity)
      mutableRemoveUnordered(entities, entity)
    }

    // Update queries for changed entities and store touched entities.
    for (const entity of tags.changed) {
      updateAllQueriesForEntity(entity)
      changedEntities.push(entity)
    }

    tags.reset()

    // Step the clock to the next frame and update the monotonic time.
    clock.step = timeStep
    clock.tick += 1
    clock.time += timeStep

    // Execute systems.
    for (let i = 0; i < systems.length; i++) {
      const system = systems[i]
      const result = queries[system.name]

      if (result) {
        system.execute(entityAdmin, ...result)
      }
    }

    let touched: Entity

    while ((touched = changedEntities.pop())) {
      updateAllQueriesForEntity(touched)
    }

    changedComponents.clear()
  }

  function hasEntity(entity: Entity) {
    return entities.includes(entity)
  }

  function createEntity() {
    const entity = (entitySequence += 1)

    entities.push(entity)
    tags.set(entity, EntityTag.Created)

    return entity
  }

  function deleteEntity(entity: Entity) {
    if (!entities.includes(entity)) {
      return
    }

    tags.set(entity, EntityTag.Deleted)

    return entity
  }

  function addComponent<F extends ComponentType>(
    entity: Entity,
    type: F,
    ...args: ComponentTypeInitializerArgs<F>
  ) {
    if (tags.has(entity, EntityTag.Deleted) || !entities.includes(entity)) {
      return false
    }

    const component = components.addComponent(entity, type, ...args)

    tags.setIfNoTag(entity, EntityTag.ComponentsChanged)

    return component as ComponentOf<F>
  }

  function removeComponent(
    entity: Entity,
    identifier: ComponentType | Component | string,
  ) {
    const componentName = getComponentTypeName(identifier)

    // No-op if the entity is being deleted.
    if (tags.has(entity, EntityTag.Deleted)) {
      return false
    }

    components.removeComponent(entity, componentName)
    tags.setIfNoTag(entity, EntityTag.ComponentsChanged)
  }

  function getMutableComponent<F extends ComponentType>(
    entity: Entity,
    type: F,
  ): ComponentOf<F> {
    const component = components.getComponent(entity, type)

    tags.setIfNoTag(entity, EntityTag.Changed)
    changedComponents.add(component)

    return component as ComponentOf<F>
  }

  function getMutableComponentByType(entity: Entity, componentName: string) {
    const component = components.getComponentByType(entity, componentName)

    tags.setIfNoTag(entity, EntityTag.Changed)
    changedComponents.add(component)

    return component
  }

  function tryGetMutableComponent<F extends ComponentType>(
    entity: Entity,
    type: F,
  ) {
    try {
      return getMutableComponent(entity, type)
    } catch {
      return null
    }
  }

  function tryGetMutableComponentByType<F extends ComponentType>(
    entity: Entity,
    componentName: string,
  ) {
    try {
      return getMutableComponentByType(entity, componentName)
    } catch {
      return null
    }
  }

  function tryGetComponent<F extends ComponentType>(entity: Entity, type: F) {
    try {
      return components.getComponent(entity, type)
    } catch {
      return null
    }
  }

  function tryGetComponentByType(entity: Entity, componentName: string) {
    try {
      return components.getComponentByType(entity, componentName)
    } catch {
      return null
    }
  }

  function createSingletonComponent<C extends ComponentType>(
    type: C,
    ...args: ComponentTypeInitializerArgs<C>
  ) {
    const entity = createEntity()

    addComponent(entity, type, ...args)

    return entity
  }

  function view() {
    return viewEntityAdmin(entityAdmin)
  }

  function insertComponent(entity: Entity, component: Component) {
    tags.setIfNoTag(entity, EntityTag.ComponentsChanged)
    components.insertComponent(entity, component)
  }

  function isChangedComponent(component: Component) {
    return changedComponents.has(component)
  }

  const {
    getComponent,
    getComponentByType,
    createComponentInstance,
    registerComponentType,
    getAllComponents,
  } = components

  config.systems.forEach(addSystem)
  config.componentTypes.forEach(registerComponentType)

  const entityAdmin = {
    // fields
    entities: entities as ReadonlyArray<Entity>,
    tags,
    clock,
    // functions
    addSystem,
    removeSystem,
    isSystemRegistered,
    tick,
    hasEntity,
    createEntity,
    deleteEntity,
    addComponent,
    insertComponent,
    removeComponent,
    getComponent,
    getComponentByType,
    getMutableComponent,
    getAllComponents,
    tryGetComponent,
    tryGetComponentByType,
    tryGetMutableComponent,
    tryGetMutableComponentByType,
    isChangedComponent,
    createComponentInstance,
    createSingletonComponent,
    registerComponentType,
    view,
    // signals
    ...signals,
    // internal
    [Internal.INTERNAL_$entityAdminEntities]: entities,
    [Internal.INTERNAL_$entityAdminSystems]: systems,
    [Internal.INTERNAL_$entityAdminQueryState]: queries,
    [Internal.INTERNAL_$entityAdminComponentAdmin]: components,
  }

  Internal.INTERNAL_entityAdminAdded.dispatch(entityAdmin)

  return entityAdmin
}

export type EntityAdmin = ReturnType<typeof createEntityAdmin>
