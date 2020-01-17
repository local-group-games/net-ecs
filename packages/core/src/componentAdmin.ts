import { Component, ComponentFactory, ComponentOf } from "./component"
import {
  debug_$componentAdminComponentPools,
  debug_$componentAdminComponentTable,
} from "./debug"
import { createStackPool, StackPool } from "./pool/stackPool"
import { GetFactoryArguments } from "./types/util"
import { resetObject } from "./util"
import { isComponentFactory } from "./util/isComponentFactory"

type ComponentTable = {
  [componentType: string]: { [key: number]: Component }
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

  function clearComponents(key: number) {
    for (const componentType in componentTable) {
      const component = componentTable[componentType][key]

      if (component) {
        removeComponent(key, component)
      }
    }
  }

  function createComponentInstance<F extends ComponentFactory>(
    componentFactory: F,
    ...args: GetFactoryArguments<F>
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

  function addComponent<F extends ComponentFactory>(
    key: number,
    componentFactory: F,
    ...args: GetFactoryArguments<F>
  ) {
    const { type } = componentFactory
    const component = createComponentInstance(componentFactory, ...args)
    const map = componentTable[type]

    if (!map) {
      throw new Error(
        `Cannot add component instance of unregistered type: ${type}`,
      )
    }

    const existing = map[key]

    if (existing) {
      removeComponent(key, existing)
    }

    map[key] = component

    return true
  }

  function removeComponent(
    key: number,
    componentOrFactory: Component | ComponentFactory,
  ) {
    const component = isComponentFactory(componentOrFactory)
      ? getComponent(key, componentOrFactory)
      : componentOrFactory
    const { type } = component
    const map = componentTable[type]

    if (!map) {
      throw new Error(
        `Attempted to remove unregistered component ${component.type}.`,
      )
    }

    if (!map[key]) {
      return false
    }

    delete map[key]

    componentPools[type].release(component)

    return true
  }

  function getComponent<F extends ComponentFactory>(
    key: number,
    componentFactory: F,
  ) {
    const { type } = componentFactory
    const component = componentTable[type][key]

    if (component) {
      return component as ComponentOf<F>
    }

    throw new Error(`Component ${type} not found on key ${key}.`)
  }

  return {
    createComponentInstance,
    registerComponentFactory,
    clearComponents,
    addComponent,
    removeComponent,
    getComponent,
    // debug
    [debug_$componentAdminComponentTable]: componentTable,
    [debug_$componentAdminComponentPools]: componentPools,
  }
}
