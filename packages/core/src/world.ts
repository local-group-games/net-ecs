import {
  Component,
  ComponentsOfTypes,
  ComponentType,
  Mutable,
  InternalComponent,
} from "./component"
import { Entity } from "./entity"
import { createStorage } from "./storage/storage"
import { query, Query } from "./storage/query"

enum DeferredOpType {
  Create,
  Remove,
}

type DeferredOp =
  | [DeferredOpType.Create, Entity, Component[], number]
  | [DeferredOpType.Remove, Entity, Component[]]

type SystemAPI<T> = Pick<World<T>, "create" | "remove" | "mut" | "query">

type World<T> = {
  create(components: Component[], tags?: number): Entity
  remove(entity: Entity, ...components: Component[]): void
  register(type: ComponentType): void
  query<C extends ComponentType[]>(...components: C): Query<C>
  tick(data: T): void
  mut<C extends Component>(component: C): Mutable<C>
  tag(entity: Entity, tag: number): void
  untag(entity: Entity, tag: number): void
}

type System<T> = (data: T, world: SystemAPI<T>) => void

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

  function _query<C extends ComponentType[]>(...components: C) {
    return query<C>(...components).bind(storage)
  }

  function tick(data: T) {
    let op: DeferredOp

    while ((op = ops.pop())) {
      switch (op[0]) {
        case DeferredOpType.Create: {
          for (let i = 0; i < op[2].length; i++) {
            ;(op[2][i] as InternalComponent).entity = op[1]
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

  function mut<T extends Component>(component: T): Mutable<T> {
    storage.bump(component.entity)
    return component
  }

  const world: World<T> = {
    create,
    remove,
    register,
    query: _query,
    tick,
    mut,
    tag,
    untag,
  }

  return world
}
