import { Component, ComponentType, ReadonlyComponent } from "./component"
import { Entity } from "./entity"
import { createStorage, Storage } from "./storage"
import { Mutable } from "./types"

export type World<T> = {
  create(components: Component[], tags?: number): Entity
  mut<C extends Component>(component: C): Mutable<C>
  register(type: ComponentType): void
  remove(entity: Entity, ...components: Component[]): void
  storage: Storage
  tag(entity: Entity, tag: number): void
  tick(data: T): void
  untag(entity: Entity, tag: number): void
}

export type SystemAPI<T> = Pick<
  World<T>,
  "create" | "remove" | "mut" | "storage" | "tag" | "untag"
>
export type System<T> = (data: T, world: SystemAPI<T>) => void

enum DeferredOpType {
  Create,
  Remove,
}

type DeferredOp =
  | [DeferredOpType.Create, Entity, Component[], number]
  | [DeferredOpType.Remove, Entity, Component[]]

export const createWorld = <T>(systems: System<T>[]): World<T> => {
  const storage = createStorage(100)
  const ops: DeferredOp[] = []

  let entity_seq = 1

  function create(components: Component[], tags: number = 0) {
    const entity = entity_seq++
    ops.unshift([DeferredOpType.Create, entity, components, tags])
    return entity
  }

  function remove(entity: Entity, ...components: Component[]) {
    ops.unshift([DeferredOpType.Remove, entity, components])
  }

  function register(type: ComponentType) {
    storage.register(type)
  }

  function tick(data: T) {
    let op: DeferredOp

    while ((op = ops.pop())) {
      switch (op[0]) {
        case DeferredOpType.Create: {
          for (let i = 0; i < op[2].length; i++) {
            op[2][i].entity = op[1]
          }
          storage.insert(op[1], op[2])
          storage.tag(op[1], op[3])
          break
        }
        case DeferredOpType.Remove:
          storage.remove(op[1], ...op[2])
          break
      }
    }

    for (let i = 0; i < systems.length; i++) {
      systems[i](data, world)
    }
  }

  function tag(entity: Entity, tag: number) {
    storage.tag(entity, tag)
  }
  function untag(entity: Entity, tag: number) {
    storage.untag(entity, tag)
  }

  function mut<T extends ReadonlyComponent>(component: T) {
    storage.bump(component.entity)
    return component as Mutable<T>
  }

  const world: World<T> = {
    create,
    mut,
    register,
    remove,
    storage,
    tag,
    tick,
    untag,
  }

  return world
}
