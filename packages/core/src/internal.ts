import { Signal } from "./signal"
import { EntityAdmin } from "./entity_admin"

// ComponentAdmin
export const INTERNAL_$componentAdminComponentTable = Symbol("componentAdminComponentTable")
export const INTERNAL_$componentAdminComponentPools = Symbol("componentAdminComponentPools")

// EntityAdmin
export const INTERNAL_$entityAdminEntities = Symbol("entityAdminEntities")
export const INTERNAL_$entityAdminSystems = Symbol("entityAdminSystems")
export const INTERNAL_$entityAdminQueryState = Symbol("entityAdminQueryState")
export const INTERNAL_$entityAdminComponentAdmin = Symbol("entityAdminComponentAdmin")

// StackPool
export const INTERNAL_$stackPoolHeap = Symbol("stackPoolHeap")

// Tools
export const INTERNAL_entityAdminAdded = new Signal<EntityAdmin>()
