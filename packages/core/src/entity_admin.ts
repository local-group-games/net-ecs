import { Component, ComponentFactory, ComponentOf } from "./component"
import { createComponentAdmin } from "./component_admin"
import { Entity } from "./entity"
import * as Internal from "./internal"
import { Selector, SelectorType } from "./selector"
import { System, SystemQueryResult } from "./system"
import { Clock } from "./types/clock"
import { FactoryArgs } from "./types/util"
import {
  getComponentType,
  mutableEmpty,
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

enum ComponentTag {
  Changed,
}

const systemNotRegisteredError = new Error("System has not been registered.")
const systemAlreadyRegisteredError = new Error("System was already registered.")

function createTagAdmin() {
  const tags = {
    [SelectorType.Created]: new Set<Entity>(),
    [SelectorType.ComponentsChanged]: new Set<Entity>(),
    [SelectorType.Changed]: new Set<Entity>(),
    [SelectorType.Destroyed]: new Set<Entity>(),
  }
  const tagsByEntity = new Map<Entity, SelectorType>()
  const changed = new Set<Entity>()

  function get(entity: Entity): SelectorType | null {
    return tagsByEntity.get(entity)
  }

  function set(entity: Entity, tag: SelectorType) {
    const currentTag = tagsByEntity.get(entity)

    if (currentTag) {
      tags[currentTag].delete(entity)
    }

    tags[tag].add(entity)
    tagsByEntity.set(entity, tag)
    changed.add(entity)
  }

  function setIfNoTag(entity: Entity, tag: SelectorType) {
    if (has(entity)) {
      return false
    }

    set(entity, tag)

    return true
  }

  function has(entity: Entity, tag?: SelectorType) {
    const currentTag = get(entity)
    return typeof tag === "number" ? currentTag === tag : Boolean(currentTag)
  }

  function remove(entity: Entity) {
    const tag = tagsByEntity.get(entity)

    if (!tag) {
      return
    }

    tags[tag].delete(entity)
    tagsByEntity.delete(entity)
  }

  function reset() {
    tags[SelectorType.Created].clear()
    tags[SelectorType.Destroyed].clear()
    tags[SelectorType.Changed].clear()
    tags[SelectorType.ComponentsChanged].clear()
    tagsByEntity.clear()
    changed.clear()
  }

  return {
    ...(tags as { [K in keyof typeof tags]: ReadonlySet<Entity> }),
    get,
    set,
    setIfNoTag,
    has,
    remove,
    reset,
    changed: changed as ReadonlySet<Entity>,
  }
}

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
  const tags = createTagAdmin()
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

    if (selector.componentType) {
      component = tryGetComponentByType(entity, selector.componentType)
      componentCheckPassed = component !== null && component !== undefined
    }

    if (!componentCheckPassed) {
      return selector.selectorType === SelectorType.Without
    }

    if (selector.selectorType === SelectorType.With) {
      return true
    }

    const x = tags.has(entity, selector.selectorType)

    if (selector.selectorType === SelectorType.Changed && component) {
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
    for (const entity of tags[SelectorType.Destroyed]) {
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
        system.update(entityAdmin, ...result)
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
    tags.set(entity, SelectorType.Created)

    return entity
  }

  function destroyEntity(entity: Entity) {
    if (!entities.includes(entity)) {
      return
    }

    mutableRemoveUnordered(entities, entity)
    tags.set(entity, SelectorType.Destroyed)

    return entity
  }

  function addComponent<F extends ComponentFactory>(
    entity: Entity,
    factory: F,
    ...args: FactoryArgs<F>
  ) {
    if (tags.has(entity, SelectorType.Destroyed) || !entities.includes(entity)) {
      return false
    }

    const component = components.addComponent(entity, factory, ...args)

    tags.setIfNoTag(entity, SelectorType.ComponentsChanged)

    return component as ComponentOf<F>
  }

  function removeComponent(entity: Entity, identifier: ComponentFactory | Component | string) {
    const componentType = getComponentType(identifier)

    // No-op if the entity is being deleted.
    if (tags.has(entity, SelectorType.Destroyed)) {
      return false
    }

    components.removeComponent(entity, componentType)
    tags.setIfNoTag(entity, SelectorType.ComponentsChanged)
  }

  function getMutableComponent<F extends ComponentFactory>(
    entity: Entity,
    factory: F,
  ): ComponentOf<F> {
    const component = components.getComponent(entity, factory)

    tags.setIfNoTag(entity, SelectorType.Changed)
    componentsByTag[ComponentTag.Changed].add(component)

    return component as ComponentOf<F>
  }

  function getMutableComponentByType(entity: Entity, componentType: string) {
    const component = components.getComponentByType(entity, componentType)

    tags.setIfNoTag(entity, SelectorType.Changed)
    componentsByTag[ComponentTag.Changed].add(component)

    return component
  }

  function tryGetMutableComponent<F extends ComponentFactory>(entity: Entity, factory: F) {
    try {
      return getMutableComponent(entity, factory)
    } catch {
      return null
    }
  }

  function tryGetMutableComponentByType<F extends ComponentFactory>(
    entity: Entity,
    componentType: string,
  ) {
    try {
      return getMutableComponentByType(entity, componentType)
    } catch {
      return null
    }
  }

  function tryGetComponent<F extends ComponentFactory>(entity: Entity, factory: F) {
    try {
      return components.getComponent(entity, factory)
    } catch {
      return null
    }
  }

  function tryGetComponentByType(entity: Entity, componentType: string) {
    try {
      return components.getComponentByType(entity, componentType)
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

  const {
    getComponent,
    getComponentByType,
    createComponentInstance,
    insertComponent,
    registerComponentFactory,
  } = components

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
    registerComponentFactory,
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
