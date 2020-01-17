import React from "react"
import { render } from "react-dom"
import { Debug } from "./components/Debug"
import { NetEcsProvider } from "./context/NetEcsContext"

function App() {
  return (
    <NetEcsProvider>
      <Debug />
    </NetEcsProvider>
  )
}

export function mount(el: HTMLElement) {
  render(<App />, el)
}
