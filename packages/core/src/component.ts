export type ComponentType = string

export type Component<
  T extends ComponentType = ComponentType,
  S extends {} = {}
> = {
  readonly type: T
} & S

export const $is_component_factory = Symbol("is_component_factory")

export interface ComponentFactory<
  T extends ComponentType = ComponentType,
  S extends {} = any,
  I extends (obj: S, ...args: any[]) => any = (obj: S, ...args: any[]) => any
> {
  type: T
  schema: S
  initialize: I
  pool: boolean
  [$is_component_factory]: true
}

export type ComponentOf<
  F extends ComponentFactory
> = F extends ComponentFactory<infer T, infer S> ? Component<T, S> : never
