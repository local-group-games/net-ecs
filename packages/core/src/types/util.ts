import { ComponentFactory } from "../component"

export type GetFactoryArguments<
  F extends ComponentFactory
> = F["initialize"] extends (obj: any, ...args: infer A) => any ? A : never
