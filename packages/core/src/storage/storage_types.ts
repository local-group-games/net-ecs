// Vector representing the current position of Component data associated with

import {
  Component,
  ComponentsOfTypes,
  ComponentType,
  InternalComponent,
  Mutable,
} from "../component"
import { Entity } from "../entity"

// an Entity.
export type ChunkLocation = [
  number, // Archetype filter
  number, // Chunk set
  number, // Chunk set storage index
]

export type Chunk<T extends ComponentType[]> = {
  components: ComponentsOfTypes<T>
  changed: Set<number>
}

export type ChunkSet<T extends ComponentType[]> = {
  chunks: Chunk<T>[]
  layout: number[]
}

export type StorageArchetype<T extends ComponentType[] = ComponentType[]> = {
  readonly filter: number
  insert(components: ComponentsOfTypes<T>): ChunkLocation
  remove(location: ChunkLocation): void
  read: (flags: number[], out: any[]) => Generator<ComponentsOfTypes<T>>
}

export type Storage = {
  flags: { [name: string]: number }
  archetypes: ReadonlyMap<number, StorageArchetype>
  insert(components: InternalComponent[]): Entity
  register(type: ComponentType): void
  remove(entity: Entity): void
  mut<T extends Component>(component: T): Mutable<T>
}
