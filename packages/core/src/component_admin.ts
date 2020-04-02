import {
  Component,
  ComponentFactory,
  ComponentOf,
  AdminComponent,
  PublicComponent,
} from "./component"
import {
  INTERNAL_$componentAdminComponentPools,
  INTERNAL_$componentAdminComponentTable,
} from "./internal"
import { createStackPool, StackPool } from "./pool/stack_pool"
import { FactoryArgs } from "./types/util"
import { deleteObjectProperties } from "./util"
import { Entity } from "./entity"

export type ComponentTable = {
  [type: string]: { [entity: number]: Component }
}

export type ComponentPools = {
  [type: string]: StackPool<Component>
}

export const componentFactoryNotRegisteredError = new Error("Component Factory is not registered.")
export const componentDoesNotExistError = new Error("Component does not exist.")
export const entityNotRegisteredError = new Error("Entity is not registered.")

export function createComponentAdmin(initialPoolSize: number) {
  // Two-dimensional hash of component instances by component type -> entity. Primarily used for
  // quick lookups of components.
  const componentTable: ComponentTable = {}
  // Object pool for each component type.
  const componentPools: ComponentPools = {}

  function getComponentsOfType(type: string) {
    const components = componentTable[type]

    if (components) {
      return components
    }

    throw componentFactoryNotRegisteredError
  }

  /**
   * Registers a component factory with the ComponentAdmin. Creates an object pool for the
   * component type and initializes a new component instance map in the componentTable.
   *
   * @param factory Component factory to register.
   */
  function registerComponentFactory(factory: ComponentFactory) {
    const { type, schema } = factory
    const reset = (obj: any) => {
      Object.assign(obj, schema)
      obj.type = type
      return obj
    }
    const create = () => reset({})
    const release = (obj: any) => {
      // Clear all properties on the object.
      deleteObjectProperties(obj)
      // Reset the object using default values.
      return reset(obj)
    }

    componentPools[type] = createStackPool(create, release, initialPoolSize)
    componentTable[type] = {}
  }

  /**
   * Remove and release all components associated with a given entity.
   *
   * @param entity Entity entity of which to clear all components
   */
  function removeAllComponents(entity: number) {
    for (const type in componentTable) {
      const component = componentTable[type][entity]

      if (component) {
        removeComponent(entity, component.type)
      }
    }
  }

  /**
   * Create a component instance using a component factory. If the component factory is pooled,
   * the object will be retained from the pool.
   *
   * @param factory Component factory to create an instance from
   * @param args Factory initializer arguments
   */
  function createComponentInstance<F extends ComponentFactory>(
    factory: F,
    ...args: FactoryArgs<F>
  ) {
    getComponentsOfType(factory.type)

    const { type, schema, initialize } = factory
    const pool = componentPools[type]
    const component: AdminComponent = pool ? pool.retain() : Object.assign({}, schema)

    initialize(component, ...args)

    return component
  }

  /**
   * Create a component and associate it with an entity entity.
   *
   * @param entity Entity to add the component to
   * @param factory Factory used to instantiate the component
   * @param args Factory initializer arguments
   */
  function addComponent<F extends ComponentFactory>(
    entity: number,
    factory: F,
    ...args: FactoryArgs<F>
  ) {
    const component = createComponentInstance(factory, ...args)

    return insertComponent(entity, component)
  }

  /**
   * Associate a component instance with an entity. Removes existing component with the same
   * type if one exists. This function also initializes the entity within the entity -> type
   * table if the entity had not been encountered yet.
   *
   * @param entity
   * @param component
   */
  function insertComponent(entity: number, component: AdminComponent) {
    const { type } = component
    const componentsOfType = getComponentsOfType(type)
    const existing = componentsOfType[entity]

    if (existing) {
      removeComponent(entity, existing.type)
    }

    component.entity = entity

    componentsOfType[entity] = component as PublicComponent

    return true
  }

  /**
   *
   * @param entity Entity to remove the component from.
   * @param component Component instance to remove.
   */
  function removeComponent(entity: number, type: string) {
    const componentsOfType = getComponentsOfType(type)
    const component = componentsOfType[entity]

    // Throw an error if the user attempted to remove a component that wasn't associated with the
    // entity.
    if (!component) {
      throw componentDoesNotExistError
    }

    const pool = componentPools[type]

    if (pool) {
      pool.release(component)
    }

    delete componentsOfType[entity]
  }

  /**
   * Get the component instance associated with a entity for a given component type.
   *
   * @param entity Entity of the lookup.
   * @param type Component type to find.
   */
  function getComponent<F extends ComponentFactory>(entity: number, type: F["type"]) {
    const component = getComponentsOfType(type)[entity]

    if (!component) {
      throw componentDoesNotExistError
    }

    return component as ComponentOf<F>
  }

  return {
    createComponentInstance,
    registerComponentFactory,
    removeAllComponents,
    addComponent,
    insertComponent,
    removeComponent,
    getComponent,
    // internal
    [INTERNAL_$componentAdminComponentTable]: componentTable,
    [INTERNAL_$componentAdminComponentPools]: componentPools,
  }
}

export type ComponentAdmin = ReturnType<typeof createComponentAdmin>
