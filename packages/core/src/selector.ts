import { ComponentFactory } from "./component"

export enum SelectorType {
  Without,
  With,
  Created,
  Destroyed,
  Changed,
  ComponentsChanged,
}

export type Selector = {
  selectorType: SelectorType
  componentType: string
}

function createSelector(selectorType: SelectorType) {
  return (factory?: ComponentFactory | string) => {
    const selector = {
      selectorType,
    } as Selector

    if (factory) {
      selector.componentType = typeof factory === "string" ? factory : factory.type
    }

    return selector
  }
}

export const Without = createSelector(SelectorType.Without)
export const With = createSelector(SelectorType.With)
export const Created = createSelector(SelectorType.Created)
export const Destroyed = createSelector(SelectorType.Destroyed)
export const Changed = createSelector(SelectorType.Changed)
export const ComponentsChanged = createSelector(SelectorType.Changed)
