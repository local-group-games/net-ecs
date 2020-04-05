import { ComponentType } from "../component"

export type Arguments<F extends (...args: any[]) => any> = F extends (...args: infer _) => any
  ? _
  : never

export type ComponentTypeInitializerArgs<F extends ComponentType> = F extends ComponentType<
  any,
  any,
  (obj: any, ...args: infer T) => any
>
  ? T
  : never
