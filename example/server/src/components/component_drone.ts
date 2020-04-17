import { createComponentType, number } from "@net-ecs/core"

export const Drone = createComponentType({
  name: "drone",
  schema: {
    speed: number,
  },
  initialize(drone, speed: number = 0.05) {
    drone.speed = speed
  },
})
