import { ComponentOf, createSystem, With } from "@net-ecs/core"
import { Color } from "../components"

function transition(color: ComponentOf<typeof Color>) {
  if (color.red > 0 && color.blue === 0) {
    color.red--
    color.green++
  }
  if (color.green > 0 && color.red === 0) {
    color.green--
    color.blue++
  }
  if (color.blue > 0 && color.green === 0) {
    color.red++
    color.blue--
  }
}

export const colorTransitionSystem = createSystem(
  "colorTransitionSystem",
  (world, [color]) => transition(world.getMutableComponent(color, Color)),
  [With(Color)],
)
