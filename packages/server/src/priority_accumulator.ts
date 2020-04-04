import { Component, Entity, EntityAdmin, mutableEmpty } from "@net-ecs/core"
import { PriorityConfig } from "./types"

export function createPriorityAccumulator(priorities: PriorityConfig) {
  const weights = new WeakMap<Component, number>()
  const temp: Component[] = []

  function updateWeight(component: Component) {
    const config = priorities[component.type]
    const weight = weights.get(component) || 0

    weights.set(component, weight + config.weight)
    temp.push(component as Component)
  }

  return {
    update(component: Component) {
      updateWeight(component)
    },
    reset() {
      mutableEmpty(temp)
    },
    *[Symbol.iterator]() {
      temp.sort((a, b) => weights.get(a)! - weights.get(b)!)

      let component: Component | undefined

      while ((component = temp.pop())) {
        weights.set(component, 0)
        yield component
      }
    },
  }
}
