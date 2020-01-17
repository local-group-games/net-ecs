import { Signal } from "./signal"
import { EntityAdmin } from "./entityAdmin"

// ComponentAdmin
export const debug_$componentAdminComponentTable = Symbol(
  "componentAdminComponentTable",
)
export const debug_$componentAdminComponentPools = Symbol(
  "componentAdminComponentPools",
)

// EntityAdmin
export const debug_$entityAdminEntities = Symbol("entityAdminEntities")
export const debug_$entityAdminSystems = Symbol("entityAdminSystems")
export const debug_$entityAdminSystemQueryResults = Symbol(
  "entityAdminSystemQueryResults",
)
export const debug_$entityAdminComponentAdmin = Symbol(
  "entityAdminComponentAdmin",
)

// StackPool
export const debug_$stackPoolHeap = Symbol("stackPoolHeap")

// Tools
export const debug_entityAdminAdded = new Signal<EntityAdmin>()
export const debug_ticked = new Signal<EntityAdmin>()

export const debug_entityAdminInstances: EntityAdmin[] = []

debug_entityAdminAdded.subscribe(entityAdmin =>
  debug_entityAdminInstances.push(entityAdmin),
)
