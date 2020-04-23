import { Entity } from "./entity"
import { AnySchema, ComponentOfSchema, Schema } from "./schema"

export type InternalComponent<
  T extends string = string,
  S extends Schema = AnySchema
> = {
  name: T
  entity?: Entity
} & ComponentOfSchema<S>

export type Component<
  T extends string = string,
  S extends Schema = AnySchema
> = Readonly<InternalComponent<T, S>>

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U> ? U[] : T[P]
}

export type SchemaInitializer<S extends AnySchema> = (
  c: ComponentOfSchema<S>,
  ...args: any[]
) => any

export interface ComponentType<
  T extends string = string,
  S extends Schema = AnySchema,
  I extends (c: ComponentOfSchema<S>, ...args: any[]) => any = (
    c: any,
    ...args: any[]
  ) => any
> {
  name: T
  schema: S
  initialize?: I
}

export type ComponentOf<C extends ComponentType> = C extends ComponentType<
  infer T,
  infer S
>
  ? Component<T, S>
  : never

export type ComponentsOfTypes<C extends ComponentType[]> = {
  [K in keyof C]: C[K] extends ComponentType ? ComponentOf<C[K]> : never
}
