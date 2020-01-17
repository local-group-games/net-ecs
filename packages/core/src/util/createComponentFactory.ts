import {
  ComponentFactory,
  ComponentType,
  $is_component_factory,
} from "../component"

export function createComponentFactory<
  T extends ComponentType,
  S extends {},
  I extends (obj: S, ...args: any[]) => void
>(type: T, schema: S, initialize: I, pool = true): ComponentFactory<T, S, I> {
  return {
    type,
    schema,
    initialize,
    pool,
    [$is_component_factory]: true,
  }
}
