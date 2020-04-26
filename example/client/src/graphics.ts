import { Application, Graphics, Text } from "pixi.js"

export const app = new Application({ antialias: true })
export const graphics = new Graphics()

document.getElementById("render")!.appendChild(app.view)
app.stage.addChild(graphics)
