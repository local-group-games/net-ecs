import React from "react";
import styled from "styled-components";
const PanelTitle = styled.header `
  padding: 10px;
  background-color: #293134;
  color: #f1f1f1;
`;
const PanelContent = styled.div `
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-rows: minmax(auto, auto);
  grid-auto-flow: dense;
  grid-gap: 10px;
`;
const PanelWrapper = styled.section `
  font-size: 12px;
  font-family: "Iosevka", monospace;
  background-color: #1f2527;
  color: #9da9b1;
  height: 100%;
  overflow: scroll;

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
`;
export function Panel(props) {
    return (<PanelWrapper>
      <PanelTitle>{props.title}</PanelTitle>
      <PanelContent>{props.children}</PanelContent>
    </PanelWrapper>);
}
