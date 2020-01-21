import {
  debug_$componentAdminComponentPools,
  debug_$componentAdminComponentTable,
  debug_$entityAdminComponentAdmin,
  debug_$entityAdminEntities,
  debug_$entityAdminQueryState,
  debug_$entityAdminSystems,
  debug_$stackPoolHeap,
} from "../debug"
import { EntityAdmin } from "../entityAdmin"
import { getReadableSelectorTypeName } from "./getReadableSelectorTypeName"

export function viewEntityAdmin(entityAdmin: EntityAdmin) {
  const systemData: {
    [systemName: string]: { [queryString: string]: number[] }
  } = {}
  const systems = entityAdmin[debug_$entityAdminSystems]
  const queryState = entityAdmin[debug_$entityAdminQueryState]
  const componentAdmin = entityAdmin[debug_$entityAdminComponentAdmin]
  const pools = componentAdmin[debug_$componentAdminComponentPools]
  const componentTable = componentAdmin[debug_$componentAdminComponentTable]
  const componentPools: { [componentName: string]: number } = {}

  for (const key in pools) {
    componentPools[key] = pools[key][debug_$stackPoolHeap].length
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
        const {
          selectorType,
          componentFactory: { type },
        } = query[i]
        selectorStrings.push(
          `${getReadableSelectorTypeName(selectorType)}(${type})`,
        )
      }
      data[selectorStrings.join(",")] = queryResults
    }

    systemData[system.name] = data
  }

  return {
    systems: systemData,
    entities: entityAdmin[debug_$entityAdminEntities],
    queryState,
    componentTable,
    componentPools,
  }
}

export type EntityAdminView = ReturnType<typeof viewEntityAdmin>
