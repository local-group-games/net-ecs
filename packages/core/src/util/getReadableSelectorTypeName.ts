import { SelectorType } from "../selector"

export function getReadableSelectorTypeName(selectorType: SelectorType) {
  switch (selectorType) {
    case SelectorType.Added:
      return "Added"
    case SelectorType.Changed:
      return "Changed"
    case SelectorType.Removed:
      return "Removed"
    case SelectorType.With:
      return "With"
    case SelectorType.Without:
      return "Without"
  }
}
