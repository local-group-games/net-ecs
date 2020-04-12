import { createComponentType, number } from "@net-ecs/core"

export const ExampleServerInfo = createComponentType({
  name: "example_server_info",
  schema: {
    tickRate: number,
    sendRate: number,
    localClientEntity: number,
    remoteClientEntity: number,
  },
})
