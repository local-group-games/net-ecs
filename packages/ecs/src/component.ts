import { Entity } from "./entity"
import { AnySchema, Schema, ComponentOfSchema } from "./schema"

export type Component<
  T extends string = string,
  S extends Schema = AnySchema
> = {
  name: T
  entity?: Entity
} & ComponentOfSchema<S>

export type ReadonlyComponent<
  T extends string = string,
  S extends Schema = AnySchema
> = Readonly<Component<T, S>>

export interface ComponentType<
  T extends string = string,
  S extends Schema = AnySchema
> {
  name: T
  schema: S
}

export type ComponentOf<C extends ComponentType> = C extends ComponentType<
  infer T,
  infer S
>
  ? Component<T, S>
  : never

export type ComponentsOf<C extends ComponentType[]> = {
  [K in keyof C]: C[K] extends ComponentType ? ComponentOf<C[K]> : never
}
