import React, { ComponentProps } from "react"
import styled from "styled-components"

const PanelTitle = styled.header`
  padding: 10px;
  background-color: #293134;
  color: #f1f1f1;
`

const PanelContentFill = styled.div`
  display: flex;
  padding: 10px;
`

const PanelContentGrid = styled.div`
  display: grid;
  padding: 10px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-rows: minmax(auto, auto);
  grid-auto-flow: dense;
  grid-gap: 10px;
`

const PanelWrapper = styled.section`
  font-size: 12px;
  font-family: "Iosevka", monospace;
  background-color: #1f2527;
  color: #9da9b1;
  overflow: scroll;
  flex: 1;

  ul {
    list-style-type: none;
  }

  dl {
    display: inline-grid;
    grid-template-columns: auto auto;
    margin: 0;

    dt {
      padding: 4px;
      text-align: right;
      word-break: break-word;
    }

    dd {
      padding: 4px;
      color: #fcb650;
      margin: 0;
    }
  }

  summary {
    cursor: pointer;
    padding: 4px;
    outline: none;
    color: #6487ab;

    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    &:active,
    &:focus {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
`

export enum PanelMode {
  Fill = "fill",
  Grid = "grid",
}

export function Panel(
  props: ComponentProps<typeof PanelWrapper> & {
    title: string
    mode?: PanelMode
  },
) {
  const { mode = PanelMode.Grid, title, children } = props

  return (
    <PanelWrapper>
      <PanelTitle>{title}</PanelTitle>
      {mode === PanelMode.Grid ? (
        <PanelContentGrid>{children}</PanelContentGrid>
      ) : (
        <PanelContentFill>{children}</PanelContentFill>
      )}
    </PanelWrapper>
  )
}
