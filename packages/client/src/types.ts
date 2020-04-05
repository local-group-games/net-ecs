import { Component, EntityAdmin } from "@net-ecs/core"

export type ComponentUpdater<C extends Component> = (
  world: EntityAdmin,
  local: C,
  remote: C,
) => void
