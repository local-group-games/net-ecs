import { Component, ComponentFactory, ComponentOf } from "./component"
import {
  $component_admin_debug_component_table,
  $component_admin_debug_component_pools,
} from "./debug"
import { Entity } from "./entity"
import { createStackPool, StackPool } from "./pool/stackPool"
import { GetFactoryArguments } from "./types/util"
import { resetObject } from "./util"
import { isComponentFactory } from "./util/isComponentFactory"

type ComponentTable = {
  [componentType: string]: { [entity: number]: Component | null }
}

export function createComponentAdmin(initialPoolSize: number) {
  const componentTable: ComponentTable = {}
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
    const map = {}

    componentTable[type] = map
    componentPools[type] = componentPool

    return map
  }

  function clearEntityComponents(entity: Entity) {
    for (const componentType in componentTable) {
      const component = componentTable[componentType][entity]

      if (component) {
        removeComponentFromEntity(entity, component)
      }
    }
  }

  function createComponentInstance<F extends ComponentFactory>(
    componentFactory: F,
    ...args: F extends ComponentFactory ? GetFactoryArguments<F> : never[]
  ) {
    const { type, initialize } = componentFactory

    if (!componentTable[type]) {
      registerComponentFactory(componentFactory)
    }

    const pool = componentPools[type]
    const component = pool.retain()

    initialize(component, ...args)

    return component
  }

  function addComponentToEntity<C extends Component | ComponentFactory>(
    entity: Entity,
    componentOrFactory: C,
    ...args: C extends ComponentFactory ? GetFactoryArguments<C> : never[]
  ) {
    const { type } = componentOrFactory

    let map = componentTable[type]
    let result: Component

    if (isComponentFactory(componentOrFactory)) {
      result = createComponentInstance(componentOrFactory, ...args)
      map = componentTable[type]
    } else {
      result = componentOrFactory
    }

    if (!map) {
      throw new Error(
        `Cannot add component instance of unregistered type: ${type}`,
      )
    }

    const existing = map[entity]

    if (existing) {
      removeComponentFromEntity(entity, existing)
    }

    map[entity] = result

    return true
  }

  function removeComponentFromEntity(
    entity: Entity,
    component: Component | ComponentFactory,
  ) {
    if (isComponentFactory(component)) {
      component = getComponent(entity, component)
    }

    const { type } = component
    const map = componentTable[type]

    if (!map) {
      throw new Error(
        `Attempted to remove component ${component.type} to unregistered entity ${entity}.`,
      )
    }

    if (!map[entity]) {
      return false
    }

    delete map[entity]

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

    return true
  }

  function getComponent<F extends ComponentFactory>(
    entity: Entity,
    componentFactory: F,
  ) {
    const { type } = componentFactory
    const component = componentTable[type][entity]

    if (component) {
      return component as ComponentOf<F>
    }

    throw new Error(`Component ${type} not found on entity ${entity}.`)
  }

  return {
    createComponentInstance,
    registerComponentFactory,
    clearEntityComponents,
    addComponentToEntity,
    removeComponentFromEntity,
    getComponent,
    // debug
    [$component_admin_debug_component_table]: componentTable,
    [$component_admin_debug_component_pools]: componentPools,
  }
}
