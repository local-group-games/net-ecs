import { mutableEmpty, Component } from "@net-ecs/ecs"

type WeightConfig = {
  [name: string]: number
}

export function createPriorityAccumulator(priorities: WeightConfig) {
  const weights = new WeakMap<Component, number>()
  const temp: Component[] = []

  function updateWeight(component: Component) {
    const baseWeight = priorities[component.name]
    const currWeight = weights.get(component) || 0

    weights.set(component, currWeight + baseWeight)
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
