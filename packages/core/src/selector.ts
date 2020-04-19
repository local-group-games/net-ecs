import { ComponentType } from "./component"
import { EntityTag } from "./entity_tag"

export type Selector = {
  tag: EntityTag
  componentType: ComponentType
}

function createSelector(tag: EntityTag) {
  return (type: ComponentType) => {
    const selector = { tag } as Selector

    if (type) {
      selector.componentType = type
    }

    return selector
  }
}

export const Without = createSelector(EntityTag.Without)
export const With = createSelector(EntityTag.With)
export const Created = createSelector(EntityTag.Created)
export const Destroyed = createSelector(EntityTag.Deleted)
export const Changed = createSelector(EntityTag.Changed)
export const ComponentsChanged = createSelector(EntityTag.Changed)
