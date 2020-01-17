import React, { PropsWithChildren, ChangeEvent, ComponentProps } from "react"
import styled from "styled-components"
import { useNetECS } from "../context/NetEcsContext"
import { stressSystem } from "../systems"

const Panel = styled.section`
  font-size: 14px;
  font-family: "PragmataPro Mono", monospace;
  background-color: #333;
  color: #f0f0f0;
  height: 100%;
  overflow: scroll;
`

const PanelTitle = styled.header`
  padding: 8px;
  background-color: #444;
`

const PanelContent = styled.div`
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`

const PanelDetails = styled.details`
  padding: 8px;

  ul {
    list-style-type: none;
  }

  dl {
    display: inline-grid;
    grid-template-columns: auto auto;

    dt {
      padding: 2px 4px;
      text-align: right;
      background-color: #444;
      word-break: break-word;
    }

    dd {
      padding: 4px;
      margin: 0;
    }
  }

  summary {
    cursor: pointer;
    padding: 4px;
    outline: none;

    &:hover {
      background-color: #444;
    }
    &:active,
    &:focus {
      background-color: #666;
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

  function onStressSystemToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked

    if (checked) {
      entityAdmin.addSystem(stressSystem)
    } else {
      entityAdmin.removeSystem(stressSystem)
    }
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
        <PanelDrawer title="components">
          <dl>{componentUI}</dl>
        </PanelDrawer>
        <PanelDrawer title="pools">
          <dl>{poolUI}</dl>
        </PanelDrawer>
        <PanelDrawer title="systems">{systemUI}</PanelDrawer>
        <PanelDrawer title="debug systems">
          <ul>
            <li>
              <label>
                <input type="checkbox" onChange={onStressSystemToggle} />
                <span>stress system</span>
              </label>
            </li>
          </ul>
        </PanelDrawer>
      </PanelContent>
    </Panel>
  )
}
