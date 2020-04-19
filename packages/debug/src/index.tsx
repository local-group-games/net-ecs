import { EntityAdmin } from "@net-ecs/core"
import React from "react"
import { render } from "react-dom"
import { Debug } from "./components/Debug"
import { NetEcsContext, NetEcsProvider } from "./context/NetEcsContext"

type DebugOptions = {
  target: EntityAdmin
}

const App = React.forwardRef<NetEcsContext, DebugOptions>((props, ref) => (
  <NetEcsProvider ref={ref} target={props.target}>
    {/* <Debug /> */}
  </NetEcsProvider>
))

export function mount(el: HTMLElement, options?: DebugOptions) {
  const ref = React.createRef<NetEcsContext>()
  render(<App {...options} ref={ref} />, el)
  return ref.current as NetEcsContext
}
