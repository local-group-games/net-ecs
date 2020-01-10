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

export function createEntityAdmin() {
  const clock: Clock = {
    step: -1,
    tick: -1,
    time: 0,
  }
  const components = new Map<Entity, Component[]>()
  const entitiesByComponent = new WeakMap<Component, Set<Entity>>()
  const systemQueryResults = new WeakMap<System, SystemQueryResult>()
  const updatedEntities = new Set<Entity>()
  const deletedEntities = new Set<Entity>()
  const systems: System[] = []

  let entitySequence = 0

  function addSystem(system: System) {
    const results = buildInitialSystemQueryResults(system)

    systems.push(system)
    systemQueryResults.set(system, results)

    for (const entity of components.keys()) {
      updateQueryForEntity(system, entity)
    }
  }

  function removeSystem(system: System) {
    mutableRemove(systems, system)
  }

  function updateQueryForEntity(system: System, entity: Entity) {
    const entityComponents = components.get(entity)
    const results = systemQueryResults.get(system)!

    if (!entityComponents) {
      for (const queryName in system.query) {
        mutableRemoveUnordered(results[queryName], entity)
      }
      return
    }

    for (const queryName in system.query) {
      const selector = system.query[queryName]
      const selectorResults = results[queryName]
      const isSelected = contains(selectorResults, entity)
      const isQueryHit = selector.every(factory =>
        entityComponents.find(component => component.$type === factory.$type),
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

    updatedEntities.forEach(updateAllQueriesForEntity)
    updatedEntities.clear()

    deletedEntities.forEach(entity => {
      const entityComponents = components.get(entity)

      if (entityComponents) {
        for (let i = 0; i < entityComponents.length; i++) {
          removeComponentFromEntity(entity, entityComponents[i])
        }
      }

      components.delete(entity)
      updateAllQueriesForEntity(entity)
    })
    deletedEntities.clear()
  }

  function createEntity(...entityComponents: Component[]) {
    const entity = (entitySequence += 1)

    components.set(entity, [])

    for (let i = 0; i < entityComponents.length; i++) {
      addComponentToEntity(entity, entityComponents[i])
    }

    updatedEntities.add(entity)

    return entity
  }

  function destroyEntity(entity: Entity) {
    deletedEntities.add(entity)

    return entity
  }

  function addComponentToEntity(entity: Entity, component: Component) {
    const entityComponents = components.get(entity)

    if (!entityComponents) {
      throw new Error(
        `Attempted to add component ${component.$type} to unregistered entity ${entity}.`,
      )
    }

    const hasComponentOfSameType = entityComponents.find(
      c => c.$type === component.$type,
    )

    if (hasComponentOfSameType) {
      throw new Error(
        `Attempted to add component ${component.$type} to ${entity}, which already has a component of that type.`,
      )
    }

    entityComponents.push(component)
    updatedEntities.add(entity)

    let componentEntities = entitiesByComponent.get(component)

    if (!componentEntities) {
      componentEntities = new Set()
    }

    componentEntities.add(entity)
    entitiesByComponent.set(component, componentEntities)

    return entity
  }

  function removeComponentFromEntity(entity: Entity, component: Component) {
    const entityComponents = components.get(entity)

    if (!entityComponents) {
      throw new Error(
        `Attempted to remove component ${component.$type} to unregistered entity ${entity}.`,
      )
    }

    const removed = mutableRemove(entityComponents, component)

    if (removed) {
      const componentEntities = entitiesByComponent.get(component)!

      componentEntities.delete(entity)

      if (componentEntities.size === 0) {
        const pool = componentPools.get(component.$type)!

        pool.release(component)
        entitiesByComponent.delete(component)
      }

      updatedEntities.add(entity)
    }

    return entity
  }

  function getComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    const entityComponents = components.get(entity)

    if (!entityComponents) {
      throw new Error(
        `Tried to get component ${componentFactory.$type} to unregistered entity ${entity}.`,
      )
    }

    const { $type } = componentFactory

    for (let i = 0; i < entityComponents.length; i++) {
      const component = entityComponents[i]

      if (component.$type === $type) {
        return component as ComponentOfFactory<F>
      }
    }

    throw new Error(`Component not found on entity ${entity}.`)
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

  const componentPools = new Map<ComponentType, StackPool<Component>>()

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
      ;(obj as any).$type = type

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

    componentPools.set(type, componentPool)
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
