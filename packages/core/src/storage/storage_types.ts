// Vector representing the current position of Component data associated with

import {
  Component,
  ComponentsOfTypes,
  ComponentType,
  InternalComponent,
} from "../component"
import { Entity } from "../entity"
import { Filter } from "./filter"

// an Entity.
export type ChunkLocation = [
  number, // Archetype filter
  number, // Chunk set
  number, // Chunk set storage index
]

export type Chunk<T extends ComponentType[] = ComponentType[]> = {
  tag: number
  components: ComponentsOfTypes<T>
  version: number
}

export type ChunkSet<T extends ComponentType[] = ComponentType[]> = {
  tag: number
  chunks: Chunk<T>[]
  version: number
}

export type Archetype<T extends ComponentType[] = ComponentType[]> = {
  readonly filter: number
  insert(components: ComponentsOfTypes<T>): ChunkLocation
  remove(location: ChunkLocation): Chunk<T>
  read(
    flags: number[],
    out: any[],
    tag?: number,
    filters?: Filter[],
  ): Generator<ComponentsOfTypes<T>>
  tag(location: ChunkLocation, tag: number): void
  untag(location: ChunkLocation, tag: number): void
  bump(location: ChunkLocation): void
}

export type Storage = {
  flags: { [name: string]: number }
  archetypes: ReadonlyMap<number, Archetype>
  insert(entity: Entity, components: InternalComponent[]): Entity
  register(type: ComponentType): void
  remove(entity: Entity, ...components: Component[]): void
  tag(entity: Entity, tag: number): void
  untag(entity: Entity, tag: number): void
  bump(entity: Entity): void
}
