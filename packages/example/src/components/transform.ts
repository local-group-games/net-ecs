import { ComponentTypes } from "../componentTypes"
import { entityAdmin } from "../entityAdmin"

export const Transform = entityAdmin.createComponentFactory(
  ComponentTypes.Transform,
  {
    x: 0,
    y: 0,
  },
  (transform, x: number, y: number) => {
    transform.x = x
    transform.y = y
  },
  1000,
)
