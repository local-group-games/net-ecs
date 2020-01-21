import {
  debug_entityAdminAdded,
  EntityAdmin,
  EntityAdminView,
} from "@net-ecs/core"
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react"

type NetEcsContext = {
  view?: EntityAdminView
}

const netEcsContext = createContext<NetEcsContext>({})

type NetEcsProviderProps = PropsWithChildren<{
  target?: string | EntityAdmin
}>

export const NetEcsProvider = (props: NetEcsProviderProps) => {
  const [view, setView] = useState<EntityAdminView>()

  useEffect(() => {
    let _unsub: () => any
    let interval: NodeJS.Timeout

    const poll = (viewFn: () => any) => {
      interval = setInterval(() => setView(viewFn()), 250)
      return () => clearInterval(interval)
    }
    const listen = (entityAdmin: EntityAdmin) => {
      _unsub = poll(entityAdmin.view)
    }

    if (typeof props.target === "string") {
      // TODO: Set up WebSocket connection with remote entity admin
    } else if (props.target) {
      listen(props.target)
    } else {
      debug_entityAdminAdded.once(listen)
      _unsub = () => debug_entityAdminAdded.unsubscribe(listen)
    }

    return () => _unsub()
  }, [props.target])

  const api: NetEcsContext = {
    view,
  }

  return (
    <netEcsContext.Provider value={api}>
      {props.children}
    </netEcsContext.Provider>
  )
}

export function useNetECS() {
  return useContext(netEcsContext)
}
