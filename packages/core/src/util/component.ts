import { ComponentFactory, Component } from "../component"

export function createComponentFactory<
  T extends string,
  S extends {},
  I extends (obj: S, ...args: any[]) => void
>(type: T, schema: S, initialize: I): ComponentFactory<T, S, I> {
  return {
    type,
    schema,
    initialize,
  }
}

export function getComponentType(identifier: ComponentFactory | Component | string) {
  return typeof identifier === "string" ? identifier : identifier.type
}
