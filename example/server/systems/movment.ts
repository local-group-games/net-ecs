import { query, SystemAPI } from "@net-ecs/ecs"
import { position, velocity, sleep } from "../components"
import { ExampleTag } from "../tags"

const size = 2
const floorSize = 10
const floorOffset = 600 - size - floorSize

export const movementQuery = query(position, velocity, sleep).filter(
  ExampleTag.Awake,
)
export const movement = (
  dt: number,
  { mut, storage, untag }: SystemAPI<number>,
) => {
  for (let [p, v, s] of movementQuery.run(storage)) {
    const { x, y } = p

    s = mut(s)
    p = mut(p)

    p.x += v.x
    p.y += v.y

    // put entities to sleep that haven't moved recently
    if (Math.abs(x - p.x) < 0.067 && Math.abs(y - p.y) < 0.067) {
      if (++s.value >= 5) {
        untag(v.entity, ExampleTag.Awake)
        continue
      }
    } else {
      s.value = 0
    }

    if (v.y > 0 && p.y >= floorOffset) {
      v = mut(v)
      // collision w/ floor and "restitution"
      v.y = -(v.y * 0.5)
      v.x *= 0.5
      p.y = floorOffset
      continue
    }
  }
}
