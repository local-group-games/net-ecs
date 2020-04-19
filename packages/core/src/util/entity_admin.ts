import {
  INTERNAL_$componentAdminComponentPools,
  INTERNAL_$componentAdminComponentTable,
  INTERNAL_$entityAdminComponentAdmin,
  INTERNAL_$entityAdminEntities,
  INTERNAL_$entityAdminQueryState,
  INTERNAL_$entityAdminSystems,
  INTERNAL_$stackPoolHeap,
} from "../internal"
import { EntityAdmin } from "../entity_admin"
import { getReadableSelectorTypeName } from "./selector"

export function viewEntityAdmin(entityAdmin: EntityAdmin) {
  const systemData: {
    [systemName: string]: { [queryString: string]: number[] }
  } = {}
  const systems = entityAdmin[INTERNAL_$entityAdminSystems]
  const queryState = entityAdmin[INTERNAL_$entityAdminQueryState]
  const componentAdmin = entityAdmin[INTERNAL_$entityAdminComponentAdmin]
  const pools = componentAdmin[INTERNAL_$componentAdminComponentPools]
  const componentTable = componentAdmin[INTERNAL_$componentAdminComponentTable]
  const componentPools: { [componentName: string]: number } = {}

  for (const key in pools) {
    componentPools[key] = pools[key][INTERNAL_$stackPoolHeap].length
  }

  for (let i = 0; i < systems.length; i++) {
    const system = systems[i]
    const results = queryState[system.name]
    const data: { [queryString: string]: number[] } = {}

    for (let i = 0; i < system.query.length; i++) {
      const query = system.query[i]
      const queryResults = results[i]
      let selectorStrings = []

      for (let i = 0; i < query.length; i++) {
        const { tag: selectorType, componentType } = query[i]
        selectorStrings.push(
          `${getReadableSelectorTypeName(selectorType)}(${componentType.name})`,
        )
      }
      data[selectorStrings.join(",")] = queryResults
    }

    systemData[system.name] = data
  }

  return {
    systems: systemData,
    entities: entityAdmin[INTERNAL_$entityAdminEntities],
    queryState,
    componentTable,
    componentPools,
  }
}

export type EntityAdminView = ReturnType<typeof viewEntityAdmin>
