import React, { useEffect, useRef, useState } from "react"
import { useNetECS, LogMessage } from "../context/NetEcsContext"
import { Log } from "./Log"
import { Panel, PanelCard, PanelDrawer, PanelMode } from "./Panel"
import styled from "styled-components"

const DebugWrapper = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
`

function useLogScroll(messages: LogMessage[]) {
  const ref = useRef<HTMLDivElement>()
  const [attached, setAttached] = useState(true)
  const { current: el } = ref

  useEffect(() => {
    if (!el) {
      return
    }

    const onScroll = () =>
      setAttached(el.scrollHeight - el.scrollTop === el.clientHeight)

    el.addEventListener("scroll", onScroll)

    return () => el.removeEventListener("scroll", onScroll)
  }, [el])

  useEffect(() => {
    if (!el) {
      return
    }

    if (attached) {
      el.scrollTo({ top: el.scrollHeight })
    }
  }, [attached, messages, el])

  return ref
}

export const Debug = () => {
  const { view, log } = useNetECS()
  const ref = useLogScroll(log.messages)

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
        {Object.entries(componentPools).map(([componentName, heapSize]) => (
          <React.Fragment key={componentName}>
            <dt>{componentName}</dt>
            <dd>{heapSize}</dd>
          </React.Fragment>
        ))}
      </dl>
    </PanelCard>
  )
  const componentTableCard = (
    <PanelCard title="components" key="components">
      <dl>
        {Object.entries(componentTable).map(([componentName, componentMap]) => (
          <React.Fragment key={componentName}>
            <dt>{componentName}</dt>
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

  return (
    <DebugWrapper>
      <Panel title="net-ecs tools">{cards}</Panel>
      <Panel title="log" mode={PanelMode.Fill} ref={ref}>
        <Log messages={log.messages} />
      </Panel>
    </DebugWrapper>
  )
}
