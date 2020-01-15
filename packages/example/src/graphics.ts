import * as PIXI from "pixi.js"

export const app = new PIXI.Application({ antialias: true })
export const graphics = new PIXI.Graphics()

document.body.appendChild(app.view)
app.stage.addChild(graphics)
