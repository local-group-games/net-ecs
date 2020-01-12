export type ComponentType = string

export type Component<
  T extends ComponentType = ComponentType,
  P extends {} = {}
> = {
  readonly type: T
} & P

export interface ComponentFactory<C extends Component = Component> {
  (...args: any[]): C
  $type: ComponentType
}

export type ComponentOfFactory<
  F extends ComponentFactory
> = F extends ComponentFactory<infer C> ? C : never
