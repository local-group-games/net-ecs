import { SelectorType } from "../selector"

export function getReadableSelectorTypeName(selectorType: SelectorType) {
  switch (selectorType) {
    case SelectorType.Created:
      return "Created"
    case SelectorType.Changed:
      return "Changed"
    case SelectorType.Destroyed:
      return "Destroyed"
    case SelectorType.With:
      return "With"
    case SelectorType.Without:
      return "Without"
  }
}
