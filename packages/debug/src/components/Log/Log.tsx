import React from "react"
import { useNetECS } from "../../context/NetEcsContext"
import styled from "styled-components"

const LogList = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0;
`

export function Log() {
  const {
    log: { messages },
  } = useNetECS()

  return (
    <LogList>
      {messages.map(message => (
        <li key={message.id}>
          t={message.time}
          {message.count > 0 && `(${message.count})`}: {message.text}
        </li>
      ))}
    </LogList>
  )
}
