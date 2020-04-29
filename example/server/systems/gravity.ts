import { query, SystemAPI } from "@net-ecs/ecs"
import { velocity } from "../components"
import { ExampleTag } from "../tags"

export const gravityQuery = query(velocity).filter(ExampleTag.Awake)
export const gravity = (dt: number, { mut, storage }: SystemAPI<number>) => {
  for (let [v] of gravityQuery.run(storage)) {
    v = mut(v)
    v.y += 0.1
  }
}
