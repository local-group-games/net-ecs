import { Component, ComponentFactory } from "./component"
import { createComponentAdmin } from "./componentAdmin"
import { Entity } from "./entity"
import { Selector, SelectorType } from "./selector"
import { System, SystemQueryResult, SystemQuery } from "./system"
import { Clock } from "./types/clock"
import { GetFactoryArguments } from "./types/util"
import { contains, mutableRemove, mutableRemoveUnordered } from "./util"
import memoize from "fast-memoize"

enum EntityTag {
  Added,
  Deleted,
  Changed,
  ComponentsChanged,
}

type EntityAdminConfig = {
  initialPoolSize: number
  useQueryMemoization: boolean
}

type EntityAdminOptions = {
  [K in keyof EntityAdminConfig]?: EntityAdminConfig[K]
}

const defaultOptions: EntityAdminConfig = {
  initialPoolSize: 500,
  useQueryMemoization: true,
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
    const results = system.query.map(() => [])

    systems.push(system)
    systemQueryResults.set(system, results)

    entities.forEach(entity => updateQueryForEntity(system, entity))
  }

  function removeSystem(system: System) {
    mutableRemove(systems, system)
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
        const components = componentAdmin.tryGetComponent(
          entity,
          selector.componentFactory,
        )
        const hasComponents = components !== null && components !== undefined

        return selector.selectorType === SelectorType.With
          ? hasComponents
          : !hasComponents
      }
    }
  }

  const memoizedSelectStore = new Map()
  const memoizedSelect = config.useQueryMemoization
    ? memoize(select, {
        serializer(args) {
          const {
            selectorType,
            componentFactory: { type },
          } = args[0] as Selector

          return selectorType + ":" + type + ":" + args[1]
        },
        cache: {
          // @ts-ignore (https://github.com/caiogondim/fast-memoize.js/issues/78)
          create() {
            return {
              has(key: any) {
                return memoizedSelectStore.has(key)
              },
              get(key: any) {
                return memoizedSelectStore.get(key)
              },
              set(key: any, value: any) {
                memoizedSelectStore.set(key, value)
              },
            }
          },
        },
      })
    : select

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

        if (!memoizedSelect(selector, entity)) {
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
      componentAdmin.clearComponentsForEntity(entity)
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
    memoizedSelectStore.clear()
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

  function addComponentToEntity<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
    ...args: GetFactoryArguments<F>
  ) {
    if (tags[EntityTag.Deleted].has(entity) || !entities.has(entity)) {
      return false
    }

    tags[EntityTag.ComponentsChanged].add(entity)

    return componentAdmin.addComponentToEntity(
      entity,
      componentFactory,
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

    tags[EntityTag.ComponentsChanged].add(entity)

    return componentAdmin.removeComponentFromEntity(entity, component)
  }

  function getComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    return componentAdmin.getComponent(entity, componentFactory)
  }

  function getMutableComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    const component = getComponent(entity, componentFactory)

    tags[EntityTag.ComponentsChanged].add(entity)

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
    return componentAdmin.tryGetComponent(entity, componentFactory)
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
  }

  return world
}

export type EntityAdmin = ReturnType<typeof createEntityAdmin>
