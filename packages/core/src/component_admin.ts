import {
  Component,
  ComponentOf,
  ComponentType,
  InternalComponent,
  PublicComponent,
} from "./component"
import {
  INTERNAL_$componentAdminComponentPools,
  INTERNAL_$componentAdminComponentTable,
} from "./internal"
import { createStackPool, StackPool } from "./pool/stack_pool"
import { resetComponentFromSchema } from "./schema"
import { initializeComponentFromSchema } from "./schema/schema_utils"
import { ComponentTypeInitializerArgs } from "./types/util"

export type ComponentTable = {
  [type: string]: Component[]
}

export type ComponentPools = {
  [type: string]: StackPool<Component>
}

export const componentTypeNotRegistered = new Error(
  "Component Type is not registered.",
)
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

    throw componentTypeNotRegistered
  }

  /**
   * Registers a component type with the ComponentAdmin. Creates an object pool for the
   * component type and initializes a new component instance map in the componentTable.
   *
   * @param type Component type to register.
   */
  function registerComponentType(type: ComponentType) {
    const { name, schema } = type

    const create = () => {
      const obj = initializeComponentFromSchema({}, schema)
      obj.name = name
      return obj
    }
    const release = (obj: any) => {
      resetComponentFromSchema(obj, schema)
      obj.name = type.name
      return obj
    }

    componentPools[name] = createStackPool(create, release, initialPoolSize)
    componentTable[name] = []
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
        removeComponent(entity, component.name)
      }
    }
  }

  /**
   * Create a component instance using a component type. If the component type is pooled,
   * the object will be retained from the pool.
   *
   * @param type Component type to create an instance from
   * @param args Type initializer arguments
   */
  function createComponentInstance<F extends ComponentType>(
    type: F,
    ...args: ComponentTypeInitializerArgs<F>
  ) {
    getComponentsOfType(type.name)

    const { name, initialize } = type
    const pool = componentPools[name]
    const instance = pool.retain()

    if (initialize) {
      initialize(instance, ...args)
    }

    return instance as InternalComponent
  }

  /**
   * Create a component and associate it with an entity entity.
   *
   * @param entity Entity to add the component to
   * @param type ComponentType used to instantiate the component
   * @param args Type initializer arguments
   */
  function addComponent<F extends ComponentType>(
    entity: number,
    type: F,
    ...args: ComponentTypeInitializerArgs<F>
  ) {
    const component = createComponentInstance(type, ...args)

    return insertComponent(entity, component) as Component
  }

  /**
   * Associate a component instance with an entity. Removes existing component with the same
   * type if one exists. This function also initializes the entity within the entity -> type
   * table if the entity had not been encountered yet.
   *
   * @param entity
   * @param component
   */
  function insertComponent(entity: number, component: InternalComponent) {
    const { name: type } = component
    const componentsOfType = getComponentsOfType(type)
    const existing = componentsOfType[entity]

    if (existing) {
      removeComponent(entity, existing.name)
    }

    component.entity = entity
    componentsOfType[entity] = component as PublicComponent

    return component
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
  function getComponent<F extends ComponentType>(
    entity: number,
    type: F,
  ): Readonly<ComponentOf<F>> {
    const component = getComponentsOfType(type.name)[entity]

    if (!component) {
      throw componentDoesNotExistError
    }

    return component as ComponentOf<F>
  }

  /**
   * Get the component instance associated with a entity for a given component type.
   *
   * @param entity Entity of the lookup.
   * @param type Component type to find.
   */
  function getComponentByType(entity: number, type: string): Component {
    const component = getComponentsOfType(type)[entity]

    if (!component) {
      throw componentDoesNotExistError
    }

    return component
  }

  function getAllComponents(entity: number) {
    const components: Component[] = []

    for (const componentType in componentTable) {
      const component = componentTable[componentType][entity]

      if (component) {
        components.push(component)
      }
    }

    return components
  }

  return {
    createComponentInstance,
    registerComponentType,
    addComponent,
    insertComponent,
    removeComponent,
    removeAllComponents,
    getComponent,
    getComponentByType,
    getAllComponents,
    // internal
    [INTERNAL_$componentAdminComponentTable]: componentTable,
    [INTERNAL_$componentAdminComponentPools]: componentPools,
  }
}

export type ComponentAdmin = ReturnType<typeof createComponentAdmin>
