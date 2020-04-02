import { Application, Graphics, Text } from "pixi.js"

export const app = new Application({ antialias: true })
export const graphics = new Graphics()
export const framerate = new Text("0", {
  fontFamily: "Arial",
  fontSize: 24,
  fill: 0xffffff,
})

framerate.x = 750

document.getElementById("game")!.appendChild(app.view)
app.stage.addChild(graphics)

app.stage.addChild(framerate)
