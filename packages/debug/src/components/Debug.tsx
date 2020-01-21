import React from "react"
import { useNetECS } from "../context/NetEcsContext"
import { Panel, PanelCard, PanelDrawer } from "./Panel"

export const Debug = () => {
  const { view } = useNetECS()

  if (!view) {
    return null
  }

  const { entities, componentTable, componentPools, systems } = view

  const totalsCard = (
    <PanelCard title="totals" key="totals">
      <dl>
        <React.Fragment>
          <dt>entities</dt>
          <dd>{entities.length}</dd>
          <dt>components</dt>
          <dd>
            {Object.values(componentTable).reduce(
              (a, x) => a + Object.keys(x).length,
              0,
            )}
          </dd>
          <dt>systems</dt>
          <dd>{Object.keys(systems).length}</dd>
        </React.Fragment>
      </dl>
    </PanelCard>
  )
  const poolsCard = (
    <PanelCard title="component pools" key="componentPools">
      <dl>
        {Object.entries(componentPools).map(([componentType, heapSize]) => (
          <React.Fragment key={componentType}>
            <dt>{componentType}</dt>
            <dd>{heapSize}</dd>
          </React.Fragment>
        ))}
      </dl>
    </PanelCard>
  )
  const componentTableCard = (
    <PanelCard title="components" key="components">
      <dl>
        {Object.entries(componentTable).map(([componentType, componentMap]) => (
          <React.Fragment key={componentType}>
            <dt>{componentType}</dt>
            <dd>{Object.keys(componentMap).length}</dd>
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
                ([queryString, queryResultCount]) => {
                  return (
                    <React.Fragment key={queryString}>
                      <dt>{queryString}</dt>
                      <dd>{queryResultCount.length}</dd>
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

  const cards = [totalsCard, componentTableCard, poolsCard, systemsCard]

  return <Panel title="net-ecs tools">{cards}</Panel>
}