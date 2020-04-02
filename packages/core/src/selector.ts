import { ComponentFactory } from "./component"

export enum SelectorType {
  Without,
  With,
  Added,
  Removed,
  Changed,
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
export const Added = createSelector(SelectorType.Added)
export const Removed = createSelector(SelectorType.Removed)
export const Changed = createSelector(SelectorType.Changed)
