import { ComponentFactory } from "./component"
import memoize from "fast-memoize"

export enum SelectorType {
  Without,
  With,
  Added,
  Removed,
  Changed,
}

export type Selector<
  T extends SelectorType = SelectorType,
  F extends ComponentFactory = ComponentFactory
> = {
  selectorType: T
  componentFactory: F
}

function createSelector<T extends SelectorType, F extends ComponentFactory>(
  selectorType: T,
) {
  return memoize(
    (componentFactory: F) =>
      ({ selectorType, componentFactory } as Selector<T, F>),
    {
      serializer(componentFactory: any) {
        return (componentFactory as ComponentFactory).type
      },
    },
  )
}

export const Without = createSelector(SelectorType.Without)
export const With = createSelector(SelectorType.With)
export const Added = createSelector(SelectorType.Added)
export const Removed = createSelector(SelectorType.Removed)
export const Changed = createSelector(SelectorType.Changed)
