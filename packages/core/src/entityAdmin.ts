import {
  Component,
  ComponentFactory,
  ComponentOfFactory,
  ComponentType,
} from "./component"
import { Entity } from "./entity"
import { createStackPool, StackPool } from "./pool/stackPool"
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
  ComponentsModified,
  Updated,
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
  const tags = {
    [EntityTag.Added]: new Set<Entity>(),
    [EntityTag.ComponentsModified]: new Set<Entity>(),
    [EntityTag.Updated]: new Set<Entity>(),
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

  function updateQueryForEntity(system: System, entity: Entity) {
    const results = systemQueryResults.get(system)!

    for (const queryName in system.query) {
      const selector = system.query[queryName]
      const selectorResults = results[queryName]
      const isSelected = contains(selectorResults, entity)
      const isQueryHit = selector.every(
        factory => componentMap[factory.$type][entity],
      )

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

    tags[EntityTag.ComponentsModified].forEach(updateAllQueriesForEntity)
    tags[EntityTag.ComponentsModified].clear()

    tags[EntityTag.Deleted].forEach(entity => {
      for (const componentType in componentMap) {
        const component = componentMap[componentType][entity]

        if (component) {
          removeComponentFromEntity(entity, component)
        }
      }

      updateAllQueriesForEntity(entity)
    })
    tags[EntityTag.Deleted].clear()
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
    tags[EntityTag.ComponentsModified].add(entity)
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
    tags[EntityTag.ComponentsModified].add(entity)

    let release = true

    for (const entityId in map) {
      if (componentMap[type][entityId] === component) {
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
    tags[EntityTag.ComponentsModified].add(entity)
    getComponent(entity, componentFactory)
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
    tryGetComponent,
    createComponentFactory,
  }

  return world
}

export type EntityAdmin = ReturnType<typeof createEntityAdmin>
