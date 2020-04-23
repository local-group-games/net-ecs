import { Component, ComponentType, SchemaInitializer } from "../component"
import { Schema } from "../schema"

export function createComponentType<
  T extends string,
  S extends Schema,
  I extends SchemaInitializer<S>
>(definition: { name: T; schema: S; initialize?: I }): ComponentType<T, S, I> {
  return definition
}

export function getComponentTypeName(
  identifier: ComponentType | Component | string,
) {
  return typeof identifier === "string" ? identifier : identifier.name
}
