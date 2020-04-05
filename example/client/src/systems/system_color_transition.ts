import { ComponentOf, createSystem, With } from "@net-ecs/core"
import { Color } from "../components"

function transition(color: ComponentOf<typeof Color>) {
  if (color.r > 0 && color.b === 0) {
    color.r--
    color.g++
  }
  if (color.g > 0 && color.r === 0) {
    color.g--
    color.b++
  }
  if (color.b > 0 && color.g === 0) {
    color.r++
    color.b--
  }
}

export const colorTransition = createSystem({
  name: "color_transition",
  query: [[With(Color)]],
  execute(world, [color]) {
    transition(world.getMutableComponent(color, Color))
  },
})
