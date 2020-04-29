import { decode } from "@msgpack/msgpack"
import { Chunk, createWorld, query, SystemAPI, Component } from "@net-ecs/ecs"
import { position, velocity, health } from "@net-ecs/example-server"
import { MessageType, NetEcsMessage } from "@net-ecs/net"
import { Client } from "@web-udp/client"
import { graphics } from "./graphics"

const udp = new Client({
  url: `ws://${window.location.hostname}:8000`,
})

const renderFilter = {
  bind() {},
  matchChunkSet() {
    return true
  },
  matchChunk() {
    return true
  },
  matchComponent(component: Component) {
    return component.x <= 800 && component.y <= 600
  },
}
const renderQuery = query(position).filter(renderFilter)
const render = (dt: number, { storage }: SystemAPI<number>) => {
  graphics.clear()

  for (const [p] of renderQuery.run(storage)) {
    graphics.beginFill(0x00ff00)
    graphics.drawRect(p.x, p.y, 2, 2)
    graphics.endFill()
  }
}

const world = createWorld([render])

world.register(position)
world.register(velocity)
world.register(health)

let t = 0

function loop(ts: number = t) {
  world.tick(t - ts)
  t = ts
  requestAnimationFrame(loop)
}

const sessionId = localStorage.getItem("sessionId") || Math.random().toString()
localStorage.setItem("sessionId", sessionId)

async function main() {
  const reliable = await udp.connect({
    binaryType: "arraybuffer",
    UNSAFE_ordered: true,
    metadata: { sessionId, reliable: true },
  })
  const unreliable = await udp.connect({
    binaryType: "arraybuffer",
    metadata: { sessionId, reliable: false },
  })
  const remoteToLocal = new Map<number, number>()

  function onMessage(data: ArrayBuffer) {
    const message = decode(data) as NetEcsMessage

    switch (message[0]) {
      case MessageType.ComponentRemoved:
        break
      case MessageType.EntitiesCreated: {
        const entities = message[1]

        for (let i = 0; i < entities.length; i++) {
          const components = entities[i]
          const remote = components[0].entity!
          const entity = world.create(components)

          remoteToLocal.set(remote, entity)
        }
        break
      }
      case MessageType.EntitiesDeleted: {
        const entities = message[1]

        for (let i = 0; i < entities.length; i++) {
          world.remove(entities[i])
        }
        break
      }
      case MessageType.StateUpdate: {
        const update = message[1][0]

        for (let i = 0; i < update.length; i++) {
          const component = update[i]
          const entity = remoteToLocal.get(component.entity)

          if (!entity) {
            continue
          }

          component.entity = entity
          world.storage.add(entity, component)
        }
        break
      }
    }
  }

  reliable.messages.subscribe(onMessage)
  unreliable.messages.subscribe(onMessage)

  loop()
}

main()
;(window as any).world = world
