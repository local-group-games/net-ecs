import * as components from "./components"
import { entityAdmin } from "./entityAdmin"
import * as systems from "./systems"

const health = components.Health(100)
const transform = components.Transform(1, 1)

entityAdmin.createEntity(health, transform)
entityAdmin.createEntity(health, transform)

entityAdmin.addSystem(systems.damage)
entityAdmin.addSystem(systems.movement)

let previousTime: number = Date.now()

setInterval(() => {
  const now = performance.now()
  const timeStep = now - previousTime
  entityAdmin.tick(timeStep)
  previousTime = now
}, (1 / 60) * 1000)
// ;(window as any).components = components
// ;(window as any).health = health
// ;(window as any).transform = transform
