import { createSystem, With } from "@net-ecs/core"
import { Color } from "../components"
import { RenderTransform } from "../components/component_render_transform"
import { app, framerate, graphics } from "../graphics"

function fromRGBto32(r: number, g: number, b: number) {
  return Number(
    "0x" +
      ("0" + r.toString(16)).slice(-2) +
      ("0" + g.toString(16)).slice(-2) +
      ("0" + b.toString(16)).slice(-2),
  )
}

export const render = createSystem({
  name: "render",
  query: [[With(Color)], [With(RenderTransform)]],
  execute(world, [color], entities) {
    const { r, g, b } = world.getComponent(color, Color)
    const color32 = fromRGBto32(r, g, b)

    graphics.clear()

    if (world.clock.tick % 60 === 0) {
      framerate.text = `${app.ticker.FPS.toFixed(0)}`
    }

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const { x, y } = world.getComponent(entity, RenderTransform)

      graphics.lineStyle(1, color32)
      graphics.drawCircle(x, y, 4)
    }
  },
})
