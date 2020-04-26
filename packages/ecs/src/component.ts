import { Entity } from "./entity"

export type Component<T extends string = string, S extends {} = {}> = {
  name: T
  entity?: Entity
} & S

export type ReadonlyComponent<
  T extends string = string,
  S extends {} = {}
> = Readonly<Component<T, S>>

export interface ComponentType<T extends string = string, S extends {} = {}> {
  name: T
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
