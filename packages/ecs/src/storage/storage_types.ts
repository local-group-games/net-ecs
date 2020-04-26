import { Component, ComponentsOf, ComponentType } from "../component"
import { Entity } from "../entity"
import { Filter } from "./filter"

export type ChunkLocation = [
  number, // Archetype filter
  number, // Chunk set
  number, // Chunk set storage index
]

export type Chunk<T extends ComponentType[] = ComponentType[]> = {
  tag: number
  components: ComponentsOf<T>
  version: number
}

export type ChunkSet<T extends ComponentType[] = ComponentType[]> = {
  tag: number
  chunks: Chunk<T>[]
  version: number
}

export type Archetype<T extends ComponentType[] = ComponentType[]> = {
  readonly filter: number
  insert(components: ComponentsOf<T>): ChunkLocation
  remove(location: ChunkLocation): Chunk<T>
  get(location: ChunkLocation): Chunk<T>
  read(
    flags: number[],
    filters: Filter[],
    out: any[],
  ): Generator<ComponentsOf<T>>
  tag(location: ChunkLocation, tag: number): void
  untag(location: ChunkLocation, tag: number): void
  bump(location: ChunkLocation): void
}

export type Storage = {
  archetypes: ReadonlyMap<number, Archetype>
  bump(entity: Entity): void
  flags: { [name: string]: number }
  insert(entity: Entity, components: Component[]): Entity
  register(type: ComponentType): void
  remove(entity: Entity, ...components: Component[]): void
  tag(entity: Entity, tag: number): void
  untag(entity: Entity, tag: number): void
  getComponents(entity: Entity): Component[]
}
