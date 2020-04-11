import { EntityTag } from "./entity_tag"
import { Entity } from "./entity"

export function createEntityTagAdmin() {
  const tags = {
    [EntityTag.Created]: new Set<Entity>(),
    [EntityTag.ComponentsChanged]: new Set<Entity>(),
    [EntityTag.Changed]: new Set<Entity>(),
    [EntityTag.Deleted]: new Set<Entity>(),
  }
  const tagsByEntity = new Map<Entity, EntityTag>()
  const changed = new Set<Entity>()

  function get(entity: Entity): EntityTag | null {
    return tagsByEntity.get(entity)
  }

  function set(entity: Entity, tag: EntityTag) {
    const currentTag = tagsByEntity.get(entity)

    if (currentTag) {
      tags[currentTag].delete(entity)
    }

    tags[tag].add(entity)
    tagsByEntity.set(entity, tag)
    changed.add(entity)
  }

  function setIfNoTag(entity: Entity, tag: EntityTag) {
    if (has(entity)) {
      return false
    }

    set(entity, tag)

    return true
  }

  function has(entity: Entity, tag?: EntityTag) {
    const currentTag = get(entity)
    return typeof tag === "number" ? currentTag === tag : Boolean(currentTag)
  }

  function remove(entity: Entity) {
    const tag = tagsByEntity.get(entity)

    if (!tag) {
      return
    }

    tags[tag].delete(entity)
    tagsByEntity.delete(entity)
  }

  function reset() {
    tags[EntityTag.Created].clear()
    tags[EntityTag.Deleted].clear()
    tags[EntityTag.Changed].clear()
    tags[EntityTag.ComponentsChanged].clear()
    tagsByEntity.clear()
    changed.clear()
  }

  return {
    ...(tags as { [K in keyof typeof tags]: ReadonlySet<Entity> }),
    get,
    set,
    setIfNoTag,
    has,
    remove,
    reset,
    changed: changed as ReadonlySet<Entity>,
  }
}
