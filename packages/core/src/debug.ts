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
export const debug_$entityAdminQueryState = Symbol("entityAdminQueryState")
export const debug_$entityAdminComponentAdmin = Symbol(
  "entityAdminComponentAdmin",
)

// StackPool
export const debug_$stackPoolHeap = Symbol("stackPoolHeap")

// Tools
export const debug_entityAdminAdded = new Signal<EntityAdmin>()
