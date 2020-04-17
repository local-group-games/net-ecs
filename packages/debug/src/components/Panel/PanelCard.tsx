import React, { ComponentProps, useState, useCallback } from "react"
import styled from "styled-components"

const PanelCardWrapper = styled.section`
  border-radius: 5px;
  border: 1px solid #293134;
`

const PanelCardTitle = styled.header`
  display: flex;
  background-color: #293134;
  border-bottom: 1px solid #293134;
  padding: 10px;
`

const PanelCardContent = styled.section`
  padding: 10px;
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
