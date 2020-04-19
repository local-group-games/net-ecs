import { NetEcsClient } from "@net-ecs/client"
import { createSystem, With } from "@net-ecs/core"
import { ExampleServerInfo } from "../components"

export const createExampleServerInfoSystem = (client: NetEcsClient) =>
  createSystem({
    name: "example_server_info",
    query: [[With(ExampleServerInfo)]],
    execute(world, [entity]) {
      if (!entity) {
        return
      }

      const serverInfo = world.getComponent(entity, ExampleServerInfo)
      const localEntity = client.remoteToLocal.get(
        serverInfo.remoteClientEntity,
      )

      if (localEntity && localEntity !== serverInfo.localClientEntity) {
        const serverInfoMutable = world.getMutableComponent(
          entity,
          ExampleServerInfo,
        )
        serverInfoMutable.localClientEntity = localEntity
      }
    },
  })
