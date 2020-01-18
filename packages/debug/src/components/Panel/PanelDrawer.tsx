import React, { ComponentProps } from "react"
import styled from "styled-components"

const PanelDetails = styled.details``

export function PanelDrawer(
  props: ComponentProps<typeof PanelDetails> & { title: string },
) {
  const { title, children, ...rest } = props

  return (
    <PanelDetails {...rest}>
      <summary>{title}</summary>
      {children}
    </PanelDetails>
  )
}
