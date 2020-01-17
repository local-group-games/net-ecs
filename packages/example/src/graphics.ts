import * as PIXI from "pixi.js"

export const app = new PIXI.Application({ antialias: true })
export const graphics = new PIXI.Graphics()
export const fps = new PIXI.Text("0", {
  fontFamily: "Arial",
  fontSize: 24,
  fill: 0xffffff,
})

fps.x = 750

document.getElementById("game")!.appendChild(app.view)
app.stage.addChild(graphics)

app.stage.addChild(fps)
