import { Component, Entity, EntityAdmin } from "@net-ecs/core"
import { PriorityConfig } from "./types"

export function createPriorityAccumulator(world: EntityAdmin, priorities: PriorityConfig) {
  const networkedComponentTypes = Object.keys(priorities)
  const weights = new WeakMap<Component, number>()
  const temp: Component[] = []

  function updateWeight(component: Component) {
    const config = priorities[component.type]
    const weight = weights.get(component) || 0

    weights.set(component, weight + config.weight)
    temp.push(component as Component)
  }

  function updateWeights(entity: Entity) {
    for (let i = 0; i < networkedComponentTypes.length; i++) {
      const componentType = networkedComponentTypes[i]
      const component = world.getComponent(entity, componentType)

      if (component) {
        updateWeight(component as Component)
      }
    }
  }

  function* update(changed: Entity[]) {
    temp.length = 0
    changed.forEach(updateWeights)
    temp.sort((a, b) => weights.get(a)! - weights.get(b)!)

    let component: Component | undefined

    while ((component = temp.pop())) {
      weights.set(component, 0)
      yield component
    }
  }

  return {
    update,
  }
}
