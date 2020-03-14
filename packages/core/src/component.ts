import { Entity } from "./entity"

export type AdminComponent<T extends string = string, S extends {} = {}> = {
  type: T
  entity?: Entity
} & S

export type PublicComponent<T extends string = string, S extends {} = {}> = {
  readonly type: T
  readonly entity: Entity
} & S

export interface ComponentFactory<
  T extends string = string,
  S extends {} = any,
  I extends (obj: S, ...args: any[]) => any = (obj: S, ...args: any[]) => any
> {
  type: T
  schema: S
  initialize: I
}

export type Component<T extends string = string, S extends {} = {}> = PublicComponent<T, S>

export type ComponentOf<F extends ComponentFactory> = F extends ComponentFactory<infer T, infer S>
  ? Component<T, S>
  : never
