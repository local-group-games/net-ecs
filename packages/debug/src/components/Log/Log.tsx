import React from "react"
import styled from "styled-components"
import { LogMessage } from "../../context/NetEcsContext"

const LogList = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0;
`

export type LogProps = {
  messages: LogMessage[]
}

export function Log(props: LogProps) {
  return (
    <LogList>
      {props.messages.map(message => (
        <li key={message.id}>
          {message.time}
          {message.count > 0 && `(${message.count})`}: {message.text}
        </li>
      ))}
    </LogList>
  )
}
