import { Entity } from "./entity"
import { Schema, ComponentOfSchema, AnySchema } from "./schema"
import { INTERNAL_$componentChanged } from "./internal"

export type InternalComponent<
  T extends string = string,
  S extends Schema = AnySchema
> = {
  name: T
  entity?: Entity
  [INTERNAL_$componentChanged]: boolean
} & ComponentOfSchema<S>

export type PublicComponent<
  T extends string = string,
  S extends Schema = AnySchema
> = {
  readonly name: T
  readonly entity: Entity
  [INTERNAL_$componentChanged]: boolean
} & ComponentOfSchema<S>

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

export type Component<
  T extends string = string,
  S extends Schema = AnySchema
> = PublicComponent<T, S>

export type ComponentOf<F extends ComponentType> = F extends ComponentType<
  infer T,
  infer S
>
  ? Component<T, S>
  : never
