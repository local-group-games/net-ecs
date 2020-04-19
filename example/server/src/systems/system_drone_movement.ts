import { ComponentOf, createSystem, With } from "@net-ecs/core"
import { Player, Transform } from "../components"
import { Drone } from "../components/component_drone"

const MIN_THRESHOLD = 1
const MAX_THRESHOLD = 200

export const droneMovement = createSystem({
  name: "drone_movement",
  query: [[With(Drone)], [With(Player)]],
  execute(world, enemies, players) {
    for (let i = 0; i < enemies.length; i++) {
      const entity = enemies[i]
      const drone = world.getComponent(entity, Drone)
      const droneTransform = world.getComponent(entity, Transform)

      let distance: number = Infinity
      let transform: ComponentOf<typeof Transform>

      for (let j = 0; j < players.length; j++) {
        const player = players[j]
        const playerTransform = world.getComponent(player, Transform)
        const dx = playerTransform.x - droneTransform.x
        const dy = playerTransform.y - droneTransform.y
        const d = Math.sqrt(dx * dx + dy * dy)

        if (d < distance) {
          distance = d
          transform = playerTransform
        }
      }

      if (!transform || distance >= MAX_THRESHOLD) {
        continue
      }

      if (distance <= MIN_THRESHOLD) {
        world.deleteEntity(entity)
        continue
      }

      const mutableDroneTransform = world.getMutableComponent(entity, Transform)

      mutableDroneTransform.x +=
        (transform.x - mutableDroneTransform.x) * (drone.speed / distance)
      mutableDroneTransform.y +=
        (transform.y - mutableDroneTransform.y) * (drone.speed / distance)
    }
  },
})
