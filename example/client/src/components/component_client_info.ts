import { createComponentType, number } from "@net-ecs/core"

export const ClientInfo = createComponentType({
  name: "client_info",
  schema: {
    localClientEntity: number,
    remoteClientEntity: number,
    lastFrameProcessedByServer: number,
  },
})
