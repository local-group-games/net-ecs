import { $is_component_factory, ComponentFactory } from "../component"

export function isComponentFactory(obj: any): obj is ComponentFactory {
  return typeof obj === "object" && obj !== null && obj[$is_component_factory]
}
