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

enum ComponentTag {
  Changed,
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

  const systems: System[] = []
  const entities: Entity[] = []
  const components = createComponentAdmin(config.initialPoolSize)
  const queries: { [systemName: string]: SystemQueryResult } = {}
  const tags = createEntityTagAdmin()
  const componentsByTag = {
    [ComponentTag.Changed]: new Set<Component>(),
  }
  const touchedEntities: Entity[] = []
  const touchedComponents: Component[] = []

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

  function select(selector: Selector, entity: Entity) {
    let componentCheckPassed = true
    let component: Component

    if (selector.componentName) {
      component = tryGetComponentByType(entity, selector.componentName)
      componentCheckPassed = component !== null && component !== undefined
    }

    if (!componentCheckPassed) {
      return selector.tag === EntityTag.Without
    }

    if (selector.tag === EntityTag.With) {
      return true
    }

    const x = tags.has(entity, selector.tag)

    if (selector.tag === EntityTag.Changed && component) {
      return x && isChangedComponent(component)
    }

    return x
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

  function tick(timeStep: number) {
    // Clear touched entities.
    mutableEmpty(touchedEntities)

    // Clear touched components.
    mutableEmpty(touchedComponents)

    // Track components that were accessed in a mutable way on the previous tick.
    for (const component of componentsByTag[ComponentTag.Changed]) {
      touchedComponents.push(component)
    }

    componentsByTag[ComponentTag.Changed].clear()

    // Release deleted entities' components before updating their queries.
    for (const entity of tags[EntityTag.Destroyed]) {
      components.removeAllComponents(entity)
    }

    // Update queries for changed entities and store touched entities.
    for (const entity of tags.changed) {
      updateAllQueriesForEntity(entity)
      touchedEntities.push(entity)
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

    for (let i = 0; i < touchedEntities.length; i++) {
      updateAllQueriesForEntity(touchedEntities[i])
    }
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

  function destroyEntity(entity: Entity) {
    if (!entities.includes(entity)) {
      return
    }

    mutableRemoveUnordered(entities, entity)
    tags.set(entity, EntityTag.Destroyed)

    return entity
  }

  function addComponent<F extends ComponentType>(
    entity: Entity,
    type: F,
    ...args: ComponentTypeInitializerArgs<F>
  ) {
    if (tags.has(entity, EntityTag.Destroyed) || !entities.includes(entity)) {
      return false
    }

    const component = components.addComponent(entity, type, ...args)

    tags.setIfNoTag(entity, EntityTag.ComponentsChanged)

    return component as ComponentOf<F>
  }

  function removeComponent(entity: Entity, identifier: ComponentType | Component | string) {
    const componentName = getComponentTypeName(identifier)

    // No-op if the entity is being deleted.
    if (tags.has(entity, EntityTag.Destroyed)) {
      return false
    }

    components.removeComponent(entity, componentName)
    tags.setIfNoTag(entity, EntityTag.ComponentsChanged)
  }

  function getMutableComponent<F extends ComponentType>(entity: Entity, type: F): ComponentOf<F> {
    const component = components.getComponent(entity, type)

    tags.setIfNoTag(entity, EntityTag.Changed)
    componentsByTag[ComponentTag.Changed].add(component)

    return component as ComponentOf<F>
  }

  function getMutableComponentByType(entity: Entity, componentName: string) {
    const component = components.getComponentByType(entity, componentName)

    tags.setIfNoTag(entity, EntityTag.Changed)
    componentsByTag[ComponentTag.Changed].add(component)

    return component
  }

  function tryGetMutableComponent<F extends ComponentType>(entity: Entity, type: F) {
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

  function isChangedComponent(component: Component) {
    return touchedComponents.includes(component)
  }

  function view() {
    return viewEntityAdmin(entityAdmin)
  }

  function setModified(component: Component) {
    if (!touchedComponents.includes(component)) {
      touchedComponents.push(component)
    }
  }

  function insertComponent(entity: Entity, component: Component) {
    tags.setIfNoTag(entity, EntityTag.ComponentsChanged)
    components.insertComponent(entity, component)
  }

  const {
    getComponent,
    getComponentByType,
    createComponentInstance,
    registerComponentType,
    getComponentType,
  } = components

  config.systems.forEach(addSystem)
  config.componentTypes.forEach(registerComponentType)

  const entityAdmin = {
    entities: entities as ReadonlyArray<Entity>,
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
    getComponentByType,
    getMutableComponent,
    tryGetComponent,
    tryGetComponentByType,
    tryGetMutableComponent,
    tryGetMutableComponentByType,
    setModified,
    createComponentInstance,
    createSingletonComponent,
    registerComponentType,
    view,
    isChangedComponent,
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
