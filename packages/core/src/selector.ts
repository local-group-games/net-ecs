import { ComponentType } from "./component"
import { EntityTag } from "./entity_tag"

export type Selector = {
  tag: EntityTag
  componentName: string
}

function createSelector(tag: EntityTag) {
  return (type?: ComponentType | string) => {
    const selector = { tag } as Selector

    if (type) {
      selector.componentName = typeof type === "string" ? type : type.name
    }

    return selector
  }
}

export const Without = createSelector(EntityTag.Without)
export const With = createSelector(EntityTag.With)
export const Created = createSelector(EntityTag.Created)
export const Destroyed = createSelector(EntityTag.Destroyed)
export const Changed = createSelector(EntityTag.Changed)
export const ComponentsChanged = createSelector(EntityTag.Changed)
