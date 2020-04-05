import { EntityTag } from "../entity_tag"

export function getReadableSelectorTypeName(selectorType: EntityTag) {
  switch (selectorType) {
    case EntityTag.Created:
      return "Created"
    case EntityTag.Changed:
      return "Changed"
    case EntityTag.Destroyed:
      return "Destroyed"
    case EntityTag.With:
      return "With"
    case EntityTag.Without:
      return "Without"
  }
}
