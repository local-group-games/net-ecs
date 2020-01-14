import {
  Component,
  ComponentFactory,
  ComponentOfFactory,
  ComponentType,
} from "./component"
import { Entity } from "./entity"
import { createStackPool, StackPool } from "./pool/stackPool"
import { Selector, SelectorType } from "./selector"
import { System, SystemQueryResult } from "./system"
import { Clock } from "./types/clock"
import {
  contains,
  mutableRemove,
  mutableRemoveUnordered,
  resetObject,
} from "./util"

function buildInitialSystemQueryResults(system: System) {
  const results: SystemQueryResult = {}

  for (const queryName of Object.keys(system.query)) {
    results[queryName] = []
  }

  return results
}

enum EntityTag {
  Added,
  ComponentsChanged,
  Changed,
  Deleted,
}

export function createEntityAdmin() {
  const clock: Clock = {
    step: -1,
    tick: -1,
    time: 0,
  }

  const entities = new Set<Entity>()
  const componentMap: {
    [componentType: string]: { [entity: number]: Component | null }
  } = {}
  const componentPools: { [key: string]: StackPool<Component> } = {}
  const systems: System[] = []
  const systemQueryResults = new WeakMap<System, SystemQueryResult>()
  const updateNextTick = new Set<Entity>()
  const tags = {
    [EntityTag.Added]: new Set<Entity>(),
    [EntityTag.ComponentsChanged]: new Set<Entity>(),
    [EntityTag.Changed]: new Set<Entity>(),
    [EntityTag.Deleted]: new Set<Entity>(),
  }

  let entitySequence = 0

  function addSystem(system: System) {
    const results = buildInitialSystemQueryResults(system)

    systems.push(system)
    systemQueryResults.set(system, results)

    entities.forEach(entity => updateQueryForEntity(system, entity))
  }

  function removeSystem(system: System) {
    mutableRemove(systems, system)
  }

  function doQuery(selector: Selector, entity: Entity) {
    switch (selector.selectorType) {
      case SelectorType.Added:
        return tags[EntityTag.Added].has(entity)
      case SelectorType.Removed:
        return tags[EntityTag.Deleted].has(entity)
      case SelectorType.Changed:
        return tags[EntityTag.Changed].has(entity)
      case SelectorType.With:
      case SelectorType.Without: {
        const components = componentMap[selector.componentFactory.$type][entity]
        const hasComponents = components !== null && components !== undefined

        return selector.selectorType === SelectorType.With
          ? hasComponents
          : !hasComponents
      }
    }

    return false
  }

  function updateQueryForEntity(system: System, entity: Entity) {
    const results = systemQueryResults.get(system)!
    const runQueryWithEntity = (selector: Selector) => doQuery(selector, entity)

    for (const queryName in system.query) {
      const selectors = system.query[queryName]
      const selectorResults = results[queryName]
      const isSelected = contains(selectorResults, entity)
      const isQueryHit = selectors.every(runQueryWithEntity)

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

  function unregisterEntity(entity: Entity) {
    for (const componentType in componentMap) {
      const component = componentMap[componentType][entity]

      if (component) {
        removeComponentFromEntity(entity, component)
      }
    }
  }

  function tick(timeStep: number) {
    for (const entity of tags[EntityTag.Added]) {
      updateAllQueriesForEntity(entity)
      updateNextTick.add(entity)
    }

    for (const entity of tags[EntityTag.Deleted]) {
      unregisterEntity(entity)
      updateAllQueriesForEntity(entity)
      updateNextTick.add(entity)
    }

    for (const entity of tags[EntityTag.ComponentsChanged]) {
      updateAllQueriesForEntity(entity)
    }

    tags[EntityTag.Added].clear()
    tags[EntityTag.Deleted].clear()
    tags[EntityTag.ComponentsChanged].clear()

    clock.step = timeStep
    clock.tick += 1
    clock.time += timeStep

    for (let i = 0; i < systems.length; i++) {
      const system = systems[i]
      const result = systemQueryResults.get(system)

      if (result) {
        system.update(world, result)
      }
    }

    for (const entity of updateNextTick) {
      updateAllQueriesForEntity(entity)
    }

    updateNextTick.clear()
  }

  function createEntity(...entityComponents: Component[]) {
    const entity = (entitySequence += 1)

    entities.add(entity)

    for (let i = 0; i < entityComponents.length; i++) {
      addComponentToEntity(entity, entityComponents[i])
    }

    tags[EntityTag.Added].add(entity)

    return entity
  }

  function destroyEntity(entity: Entity) {
    entities.delete(entity)

    tags[EntityTag.Deleted].add(entity)

    return entity
  }

  function addComponentToEntity(entity: Entity, component: Component) {
    const { type } = component
    const map = componentMap[type]

    if (!map) {
      throw new Error(`Component ${type} has not been registered.`)
    }

    map[entity] = component

    tags[EntityTag.ComponentsChanged].add(entity)
  }

  function removeComponentFromEntity(entity: Entity, component: Component) {
    const { type } = component
    const map = componentMap[type]

    if (!map[entity]) {
      throw new Error(
        `Attempted to remove component ${component.type} to unregistered entity ${entity}.`,
      )
    }

    map[entity] = null
    tags[EntityTag.ComponentsChanged].add(entity)

    let release = true

    for (const entityId in map) {
      if (map[entityId] === component) {
        release = false
        break
      }
    }

    if (release) {
      const pool = componentPools[type]
      pool.release(component)
    }

    return entity
  }

  function getComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    const { $type } = componentFactory
    const component = componentMap[$type][entity]

    if (component) {
      return component as ComponentOfFactory<F>
    }

    throw new Error(`Component ${$type} not found on entity ${entity}.`)
  }

  function getMutableComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    tags[EntityTag.ComponentsChanged].add(entity)

    getComponent(entity, componentFactory)
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
      return getComponent(entity, componentFactory)
    } catch {
      return null
    }
  }

  function createComponentFactory<
    T extends ComponentType,
    D extends {},
    I extends (base: Component<T, D>, ...args: any[]) => void
  >(
    type: T,
    defaults: D,
    instantiate: I,
    poolSize: number,
  ): ComponentFactory<Component<T, D>> {
    const reset = (obj: any) => {
      Object.assign(obj, defaults)
      ;(obj as any).type = type

      return obj
    }
    const create = () => reset({})
    const release = (obj: any) => {
      resetObject(obj)
      return reset(obj)
    }
    const componentPool = createStackPool(create, release, poolSize)

    function componentFactory<
      A extends any[] = I extends (base: any, ...args: infer _) => void
        ? _
        : never
    >(...args: A) {
      const component = componentPool.retain()

      instantiate(component, ...args)

      return component
    }

    componentMap[type] = {}
    componentPools[type] = componentPool
    componentFactory.$type = type

    return componentFactory
  }

  const world = {
    addSystem,
    removeSystem,
    clock,
    tick,
    createEntity,
    destroyEntity,
    addComponentToEntity,
    removeComponentFromEntity,
    getComponent,
    getMutableComponent,
    tryGetComponent,
    tryGetMutableComponent,
    createComponentFactory,
  }

  return world
}

export type EntityAdmin = ReturnType<typeof createEntityAdmin>
