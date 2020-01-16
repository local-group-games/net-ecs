import {
  ComponentFactory,
  ComponentType,
  $is_component_factory,
} from "../component"

export function createComponentFactory<
  T extends ComponentType,
  S extends {},
  I extends (obj: S, ...args: any[]) => void
>(type: T, schema: S, initialize: I): ComponentFactory<T, S, I> {
  return {
    type,
    schema,
    initialize,
    [$is_component_factory]: true,
  }
}
