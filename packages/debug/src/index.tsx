import React from "react"
import { render } from "react-dom"
import { Debug } from "./components/Debug"
import { NetEcsProvider } from "./context/NetEcsContext"
import { EntityAdmin } from "@net-ecs/core"

type AppProps = {
  target?: string | EntityAdmin
}

const defaultProps: AppProps = {}

function App(props: AppProps) {
  return (
    <NetEcsProvider target={props.target}>
      <Debug />
    </NetEcsProvider>
  )
}

export function mount(el: HTMLElement, options: AppProps = defaultProps) {
  render(<App {...options} />, el)
}
