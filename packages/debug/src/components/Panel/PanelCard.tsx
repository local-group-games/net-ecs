import React, { ComponentProps, useState, useCallback } from "react"
import styled from "styled-components"

const PanelCardWrapper = styled.section`
  border-radius: 5px;
  background-color: #293134;
  padding: 10px;
`

const PanelCardTitle = styled.header`
  display: flex;
  color: #f1f1f1;

  &:after {
    content: "";
    flex: 1;
    height: 2px;
    position: relative;
    top: 4px;
    margin-left: 5px;
    border-top: 1px solid #384044;
    border-bottom: 1px solid #384044;
  }
`

const PanelCardContent = styled.section`
  padding: 10px 0;
`

export function PanelCard(
  props: ComponentProps<typeof PanelCardWrapper> & { title: string },
) {
  return (
    <PanelCardWrapper>
      <PanelCardTitle>{props.title}</PanelCardTitle>
      <PanelCardContent>{props.children}</PanelCardContent>
    </PanelCardWrapper>
  )
}
