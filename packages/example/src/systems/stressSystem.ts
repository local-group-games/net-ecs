import {
  createComponentFactory,
  createSystem,
  With,
  Without,
} from "@net-ecs/core"

const ComponentA = createComponentFactory("A", {}, obj => {})
const ComponentB = createComponentFactory("B", { n: 0 }, (obj, n: number) => {
  obj.n = n
})

export const stressSystem = createSystem(
  (world, a, b, neither) => {
    for (let i = 0; i < a.length; i++) {
      if (Math.random() > 0.5) {
        world.removeComponentFromEntity(a[i], ComponentA)
        world.addComponentToEntity(a[i], ComponentB, Math.random())
      }
    }

    for (let i = 0; i < b.length; i++) {
      if (Math.random() > 0.5) {
        world.removeComponentFromEntity(b[i], ComponentB)
        world.addComponentToEntity(b[i], ComponentA)
      }
    }

    for (let i = 0; i < neither.length; i++) {
      if (Math.random() > 0.5) {
        world.addComponentToEntity(neither[i], ComponentA)
      } else {
        world.addComponentToEntity(neither[i], ComponentB, Math.random())
      }
    }
  },
  [With(ComponentA)],
  [With(ComponentB)],
  [Without(ComponentA), Without(ComponentB)],
)
