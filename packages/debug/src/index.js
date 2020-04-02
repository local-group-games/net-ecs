import React from "react";
import { render } from "react-dom";
import { Debug } from "./components/Debug";
import { NetEcsProvider } from "./context/NetEcsContext";
const defaultProps = {};
function App(props) {
    return (<NetEcsProvider target={props.target}>
      <Debug />
    </NetEcsProvider>);
}
export function mount(el, options = defaultProps) {
    render(<App {...options}/>, el);
}
