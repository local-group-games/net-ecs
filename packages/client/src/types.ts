import { Component } from "@net-ecs/core"

export type ComponentUpdater<C extends Component> = (local: C, remote: C) => void
