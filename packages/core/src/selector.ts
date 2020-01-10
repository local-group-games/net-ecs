import { ComponentFactory } from "./component"

enum SelectorType {
  Without,
  With,
  Added,
  Removed,
  Changed,
}

export type Selector = {
  type: SelectorType
  componentType: string
}

export function Without(componentFactory: ComponentFactory) {
  return { type: SelectorType.Without, componentType: componentFactory.$type }
}
export function With(componentFactory: ComponentFactory) {
  return { type: SelectorType.With, componentType: componentFactory.$type }
}
export function Added(componentFactory: ComponentFactory) {
  return { type: SelectorType.Added, componentType: componentFactory.$type }
}
export function Removed(componentFactory: ComponentFactory) {
  return { type: SelectorType.Removed, componentType: componentFactory.$type }
}
export function Changed(componentFactory: ComponentFactory) {
  return { type: SelectorType.Changed, componentType: componentFactory.$type }
}
