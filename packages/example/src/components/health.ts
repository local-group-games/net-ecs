import { ComponentTypes } from "../componentTypes"
import { entityAdmin } from "../entityAdmin"

export const Health = entityAdmin.createComponentFactory(
  ComponentTypes.Health,
  {
    max: 0,
    value: 0,
  },
  (health, max: number, currentHealth = max) => {
    health.max = max
    health.value = currentHealth
  },
  1000,
)
