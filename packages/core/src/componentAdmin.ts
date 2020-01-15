import { Component, ComponentFactory, ComponentOfFactory } from "./component"
import { Entity } from "./entity"
import { createStackPool, StackPool } from "./pool/stackPool"
import { GetFactoryArguments } from "./types/util"
import { resetObject } from "./util"

type ComponentTable = {
  [componentType: string]: { [entity: number]: Component | null }
}

export function createComponentAdmin(initialPoolSize: number) {
  const componentMap: ComponentTable = {}
  const componentPools: { [componentType: string]: StackPool<Component> } = {}

  function registerComponentFactory(componentFactory: ComponentFactory) {
    const { type, schema } = componentFactory

    const reset = (obj: any) => {
      Object.assign(obj, schema)

      obj.type = type

      return obj
    }
    const create = () => reset({})
    const release = (obj: any) => {
      resetObject(obj)

      return reset(obj)
    }
    const componentPool = createStackPool(create, release, initialPoolSize)

    componentMap[type] = {}
    componentPools[type] = componentPool
  }

  function clearComponentsForEntity(entity: Entity) {
    for (const componentType in componentMap) {
      const component = componentMap[componentType][entity]

      if (component) {
        removeComponentFromEntity(entity, component)
      }
    }
  }

  function addComponentToEntity<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
    ...args: GetFactoryArguments<F>
  ) {
    const { type, initialize } = componentFactory

    if (!componentMap[type]) {
      registerComponentFactory(componentFactory)
    }

    const pool = componentPools[type]
    const map = componentMap[type]
    const component = pool.retain()

    initialize(component, ...args)

    map[entity] = component
  }

  function removeComponentFromEntity(
    entity: Entity,
    component: Component | ComponentFactory,
  ) {
    const { type } = component
    const map = componentMap[type]

    if (!map[entity]) {
      throw new Error(
        `Attempted to remove component ${component.type} to unregistered entity ${entity}.`,
      )
    }

    map[entity] = null

    let release = true

    for (const entityId in map) {
      if (map[entityId] === component) {
        release = false
        break
      }
    }

    if (release) {
      componentPools[type].release(component)
    }

    return entity
  }

  function getComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    const { type } = componentFactory
    const component = componentMap[type][entity]

    if (component) {
      return component as ComponentOfFactory<F>
    }

    throw new Error(`Component ${type} not found on entity ${entity}.`)
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

  return {
    registerComponentFactory,
    clearComponentsForEntity,
    addComponentToEntity,
    removeComponentFromEntity,
    getComponent,
    tryGetComponent,
  }
}
