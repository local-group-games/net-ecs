import React, { PropsWithChildren, ChangeEvent, ComponentProps } from "react"
import styled from "styled-components"
import { useNetECS } from "../context/NetEcsContext"

const Panel = styled.section`
  font-size: 14px;
  font-family: "PragmataPro Mono", monospace;
  background-color: #333;
  color: #f0f0f0;
`

const PanelTitle = styled.header`
  padding: 8px;
  background-color: #444;
`

const PanelContent = styled.div`
  padding: 8px;
  display: grid;
  grid-template-columns: 33.33333% 33.33333% 33.33333%;
`

const PanelDetails = styled.details`
  padding: 8px;

  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
  }

  dl {
    display: inline-grid;
    grid-template-columns: auto auto;

    dt {
      padding: 2px 4px;
      text-align: right;
      background-color: #444;
    }

    dd {
      padding: 2px 4px;
      margin: 0;
    }
  }
`

const PanelDrawer = (
  props: ComponentProps<typeof PanelDetails> & { title: string },
) => {
  const { title, children, ...rest } = props
  return (
    <PanelDetails {...rest}>
      <summary>{title}</summary>
      {children}
    </PanelDetails>
  )
}

export const Debug = () => {
  const debug = useNetECS()

  if (!debug.currentEntityAdminDetails) {
    return null
  }

  const {
    entityAdmins,
    currentEntityAdminDetails: {
      entityAdmin,
      stats: {
        entityCount,
        componentCount,
        componentTypes,
        componentPools,
        systems,
      },
    },
    setEntityAdmin,
  } = debug

  const poolUI = Object.entries(componentPools).map(
    ([componentType, heapSize]) => (
      <React.Fragment key={componentType}>
        <dt>{componentType}</dt>
        <dd>{heapSize}</dd>
      </React.Fragment>
    ),
  )
  const componentUI = Object.entries(componentTypes).map(
    ([componentType, componentCount]) => (
      <React.Fragment key={componentType}>
        <dt>{componentType}</dt>
        <dd>{componentCount}</dd>
      </React.Fragment>
    ),
  )

  const systemUI = Object.entries(systems).map(([systemName, queryResults]) => {
    return (
      <PanelDrawer title={systemName} key={systemName}>
        <dl>
          {Object.entries(queryResults).map(([queryKey, queryResultCount]) => {
            return (
              <React.Fragment key={queryKey}>
                <dt>{queryKey}</dt>
                <dd>{queryResultCount}</dd>
              </React.Fragment>
            )
          })}
        </dl>
      </PanelDrawer>
    )
  })

  function onEntityAdminSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const i = +e.target.value
    const entityAdmin = entityAdmins[i]

    setEntityAdmin(entityAdmin)
  }

  return (
    <Panel>
      <PanelTitle>net-ecs debug</PanelTitle>
      <PanelContent>
        <PanelDrawer title="admin">
          <select onChange={onEntityAdminSelectChange}>
            {entityAdmins.map((_, i) => (
              <option value={i} key={i}>
                instance {i}
              </option>
            ))}
          </select>
          <dl>
            <dt>entities</dt>
            <dd>{entityCount}</dd>
            <dt>components</dt>
            <dd>{componentCount}</dd>
          </dl>
        </PanelDrawer>
        <PanelDrawer open title="components">
          <dl>{componentUI}</dl>
        </PanelDrawer>
        <PanelDrawer open title="pools">
          <dl>{poolUI}</dl>
        </PanelDrawer>
        <PanelDrawer title="systems">{systemUI}</PanelDrawer>
      </PanelContent>
    </Panel>
  )
}
