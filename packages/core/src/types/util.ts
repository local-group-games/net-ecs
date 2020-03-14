import { ComponentFactory } from "../component"

export type Arguments<F extends (...args: any[]) => any> = F extends (...args: infer _) => any
  ? _
  : never

export type FactoryArgs<F extends ComponentFactory> = F["initialize"] extends (
  obj: any,
  ...args: infer A
) => any
  ? A
  : never
