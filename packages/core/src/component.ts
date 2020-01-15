export type ComponentType = string

export type Component<
  T extends ComponentType = ComponentType,
  S extends {} = {}
> = {
  readonly type: T
} & S

export interface ComponentFactory<
  T extends ComponentType = ComponentType,
  S extends {} = any,
  I extends (obj: S, ...args: any[]) => any = (obj: S, ...args: any[]) => any
> {
  type: T
  schema: S
  initialize: I
}

export type ComponentOfFactory<
  F extends ComponentFactory
> = F extends ComponentFactory<infer T, infer S> ? Component<T, S> : never
