import { createSystem, With, Entity, ComponentOf } from "@net-ecs/core"
import { Drone } from "../components/component_drone"
import { Player, Transform } from "../components"

export const droneMovement = createSystem({
  name: "drone_movement",
  query: [[With(Drone)], [With(Player)]],
  execute(world, enemies, players) {
    for (let i = 0; i < enemies.length; i++) {
      const entity = enemies[i]
      const drone = world.getComponent(entity, Drone)
      const droneTransform = world.getMutableComponent(entity, Transform)

      let closestPlayerDifference: number = Infinity
      let closestPlayerTransform: ComponentOf<typeof Transform>

      for (let j = 0; j < players.length; j++) {
        const player = players[j]
        const playerTransform = world.getComponent(player, Transform)
        const a = playerTransform.x - droneTransform.x
        const b = playerTransform.y - droneTransform.y
        const c = Math.sqrt(a * a + b * b)

        if (c < closestPlayerDifference) {
          closestPlayerDifference = c
          closestPlayerTransform = playerTransform
        }
      }

      if (!closestPlayerTransform) {
        continue
      }

      droneTransform.x +=
        (closestPlayerTransform.x - droneTransform.x) * drone.speed
      droneTransform.y +=
        (closestPlayerTransform.y - droneTransform.y) * drone.speed
    }
  },
})
