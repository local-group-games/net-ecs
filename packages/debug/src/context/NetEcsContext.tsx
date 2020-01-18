import {
  debug_$componentAdminComponentPools,
  debug_$componentAdminComponentTable,
  debug_$entityAdminComponentAdmin,
  debug_$entityAdminEntities,
  debug_$stackPoolHeap,
  debug_entityAdminAdded,
  debug_entityAdminInstances,
  debug_ticked,
  EntityAdmin,
  debug_$entityAdminSystemQueryResults,
  SelectorType,
} from "@net-ecs/core"
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react"

type EntityAdminStats = {
  entities: number[]
  components: { [componentType: string]: number }
  pools: { [componentType: string]: number }
  systems: { [systemName: string]: { [queryString: string]: number } }
}

type EntityAdminDetails = {
  entityAdmin: EntityAdmin
  stats: EntityAdminStats
}

type NetEcsContext = {
  entityAdmins: EntityAdmin[]
  currentEntityAdminDetails: EntityAdminDetails | null
  setEntityAdmin: (entityAdmin: EntityAdmin) => void
}

const netEcsContext = createContext<NetEcsContext>({
  entityAdmins: [],
  currentEntityAdminDetails: null,
  setEntityAdmin: (entityAdmin: EntityAdmin) => {},
})

type NetEcsProviderProps = PropsWithChildren<{}>

function getReadableSelectorTypeName(selectorType: SelectorType) {
  switch (selectorType) {
    case SelectorType.Added:
      return "Added"
    case SelectorType.Changed:
      return "Changed"
    case SelectorType.Removed:
      return "Removed"
    case SelectorType.With:
      return "With"
    case SelectorType.Without:
      return "Without"
  }
}

function getEntityAdminStats(entityAdmin: EntityAdmin): EntityAdminStats {
  const entities = Array.from(entityAdmin[debug_$entityAdminEntities])
  const systemQueryResults = entityAdmin[debug_$entityAdminSystemQueryResults]
  const componentAdmin = entityAdmin[debug_$entityAdminComponentAdmin]
  const componentTable = componentAdmin[debug_$componentAdminComponentTable]
  const componentPools = componentAdmin[debug_$componentAdminComponentPools]
  const components = Object.entries(componentTable).reduce(
    (a, [componentType, map]) => ({
      ...a,
      [componentType]: Object.keys(map).length,
    }),
    {},
  )
  const pools = Object.entries(componentPools).reduce(
    (a, [componentType, pool]) => ({
      ...a,
      [componentType]: pool[debug_$stackPoolHeap].length,
    }),
    {},
  )
  const systems = Array.from(systemQueryResults).reduce(
    (a, [system, results]) => {
      a[system.name] = system.query.reduce((selectorResults, query, i) => {
        const key = query
          .map(
            x =>
              `${getReadableSelectorTypeName(x.selectorType)}(${
                x.componentFactory.type
              })`,
          )
          .join(",")

        selectorResults[key] = results[i].length
        return selectorResults
      }, {} as { [key: string]: number })
      return a
    },
    {} as { [key: string]: { [key: string]: number } },
  )

  return {
    entities,
    components,
    pools,
    systems,
  }
}

export const NetEcsProvider = (props: NetEcsProviderProps) => {
  const [
    currentEntityAdminDetails,
    setCurrentEntityAdminDetails,
  ] = useState<EntityAdminDetails | null>(null)
  const [entityAdmins, setEntityAdmins] = useState<EntityAdmin[]>(
    debug_entityAdminInstances,
  )
  const addEntityAdmin = useCallback(() => {
    const entityAdminInstances = debug_entityAdminInstances.slice()

    setEntityAdmins(entityAdminInstances.slice())

    if (entityAdminInstances.length === 1) {
      const entityAdmin = entityAdminInstances[0]

      setCurrentEntityAdminDetails({
        entityAdmin,
        stats: getEntityAdminStats(entityAdmin),
      })
    }
  }, [entityAdmins])

  const previousTime = useRef(performance.now())

  function onTick(entityAdmin: EntityAdmin) {
    if (
      !currentEntityAdminDetails ||
      entityAdmin !== currentEntityAdminDetails.entityAdmin
    ) {
      return
    }

    const now = performance.now()

    if (now - previousTime.current > 1000) {
      updateCurrentEntityAdminStats()
      previousTime.current = now
    }
  }

  function updateCurrentEntityAdminStats() {
    if (!currentEntityAdminDetails) {
      return
    }

    setCurrentEntityAdminDetails({
      ...currentEntityAdminDetails,
      stats: getEntityAdminStats(currentEntityAdminDetails.entityAdmin),
    })
  }

  useEffect(() => {
    debug_ticked.subscribe(onTick)
    return () => debug_ticked.unsubscribe(onTick)
  }, [currentEntityAdminDetails])

  useEffect(() => {
    debug_entityAdminAdded.subscribe(addEntityAdmin)
    return () => debug_entityAdminAdded.unsubscribe(addEntityAdmin)
  }, [])

  function setEntityAdmin(entityAdmin: EntityAdmin) {
    const stats = getEntityAdminStats(entityAdmin)

    setCurrentEntityAdminDetails({
      entityAdmin,
      stats,
    })
  }

  const api: NetEcsContext = {
    entityAdmins,
    currentEntityAdminDetails,
    setEntityAdmin,
  }

  return (
    <netEcsContext.Provider value={api}>
      {props.children}
    </netEcsContext.Provider>
  )
}

export function useNetECS() {
  return useContext(netEcsContext)
}
