import React from "react"
import { useNetECS } from "../context/NetEcsContext"
import { Panel, PanelCard, PanelDrawer } from "./Panel"

export const Debug = () => {
  const debug = useNetECS()

  if (!debug.currentEntityAdminDetails) {
    return null
  }

  const {
    entityAdmins,
    currentEntityAdminDetails: {
      stats: { entities, components, pools, systems },
    },
    setEntityAdmin,
  } = debug

  const totalsCard = (
    <PanelCard title="totals" key="totals">
      <dl>
        <React.Fragment>
          <dt>entities</dt>
          <dd>{entities.length}</dd>
          <dt>components</dt>
          <dd>{Object.values(components).reduce((a, x) => a + x, 0)}</dd>
          <dt>systems</dt>
          <dd>{Object.keys(systems).length}</dd>
        </React.Fragment>
      </dl>
    </PanelCard>
  )
  const poolsCard = (
    <PanelCard title="pools" key="pools">
      <dl>
        {Object.entries(pools).map(([componentType, heapSize]) => (
          <React.Fragment key={componentType}>
            <dt>{componentType}</dt>
            <dd>{heapSize}</dd>
          </React.Fragment>
        ))}
      </dl>
    </PanelCard>
  )
  const componentsCard = (
    <PanelCard title="components" key="components">
      <dl>
        {Object.entries(components).map(([componentType, componentCount]) => (
          <React.Fragment key={componentType}>
            <dt>{componentType}</dt>
            <dd>{componentCount}</dd>
          </React.Fragment>
        ))}
      </dl>
    </PanelCard>
  )

  const systemsCard = (
    <PanelCard title="systems" key="systems">
      {Object.entries(systems).map(([systemName, queryResults]) => {
        return (
          <PanelDrawer title={systemName} key={systemName}>
            <dl>
              {Object.entries(queryResults).map(
                ([queryKey, queryResultCount]) => {
                  return (
                    <React.Fragment key={queryKey}>
                      <dt>{queryKey}</dt>
                      <dd>{queryResultCount}</dd>
                    </React.Fragment>
                  )
                },
              )}
            </dl>
          </PanelDrawer>
        )
      })}
    </PanelCard>
  )

  const adminCard = (
    <PanelCard title="admin" key="admin">
      <select onChange={onEntityAdminSelectChange}>
        {entityAdmins.map((_, i) => (
          <option value={i} key={i}>
            instance {i}
          </option>
        ))}
      </select>
    </PanelCard>
  )

  function onEntityAdminSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const i = +e.target.value
    const entityAdmin = entityAdmins[i]

    setEntityAdmin(entityAdmin)
  }

  const cards = [adminCard, totalsCard, componentsCard, poolsCard, systemsCard]

  return <Panel title="net-ecs tools">{cards}</Panel>
}
