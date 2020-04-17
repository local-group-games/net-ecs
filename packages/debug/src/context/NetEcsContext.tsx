import {
  EntityAdmin,
  EntityAdminView,
  INTERNAL_entityAdminAdded,
  noop,
} from "@net-ecs/core"
import produce from "immer"
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState,
  useCallback,
} from "react"

export type NetEcsContext = {
  attach(context: EntityAdmin): void
  view?: EntityAdminView
  log: ReturnType<typeof useLog>
}

const netEcsContext = createContext<NetEcsContext>({
  attach: noop,
  log: {
    info: noop,
    limit: 0,
    messages: [],
  },
})

type NetEcsProviderProps = PropsWithChildren<{
  target?: EntityAdmin
}>

export type LogMessage = {
  id: number
  time: number
  text: string
  count?: number
  start?: number
  context?: LogContext
}

type LogState = {
  messages: LogMessage[]
  limit: number
}

enum LogActionType {
  Info = "log/info",
}

type LogLogAction = { type: LogActionType.Info; payload: LogMessage }

type LogAction = LogLogAction

type LogContext = {
  id: string
  duration: number
}

function logReducer(state: LogState, action: LogAction) {
  return produce(state, draft => {
    switch (action.type) {
      case LogActionType.Info: {
        const message = { ...action.payload }
        const current = draft.messages[draft.messages.length - 1]

        if (
          current &&
          current.context &&
          (!message.context || message.context.id !== current.context.id)
        ) {
          current.start = -Infinity
        }

        if (message.context) {
          const i = draft.messages.findIndex(
            m =>
              m.context &&
              m.context.id === message.context.id &&
              message.time - m.start <= message.context.duration,
          )

          if (i > -1) {
            const previous = draft.messages[i]
            message.count = previous.count + 1
            message.start = previous.start
            draft.messages[i] = message
            return
          }

          message.count = 0
          message.start = message.time
        }

        draft.messages.push(message)
        draft.messages = draft.messages.slice(
          draft.messages.length + 1 - draft.limit,
        )
      }
    }
  })
}

const initialState: LogState = { limit: 0, messages: [] }

function useLog(limit: number = 100) {
  const sequence = useRef(0)
  const [state, dispatch] = useReducer(logReducer, { ...initialState, limit })

  return {
    info(text: string, context?: LogContext) {
      dispatch({
        type: LogActionType.Info,
        payload: {
          id: ++sequence.current,
          time: +performance.now().toFixed(2),
          text,
          context,
        },
      })
    },
    ...state,
  }
}

export const NetEcsProvider = React.forwardRef<
  NetEcsContext,
  NetEcsProviderProps
>((props, ref) => {
  const [target, setTarget] = useState<EntityAdmin>(props.target)
  const [view, setView] = useState<EntityAdminView>()
  const log = useLog()
  const attach = useCallback((admin: EntityAdmin) => {
    setTarget(admin)
  }, [])

  useEffect(() => {
    let _unsub: () => any
    let interval: NodeJS.Timeout

    const poll = (viewFn: () => any) => {
      interval = setInterval(() => setView(viewFn()), 250)
      return () => clearInterval(interval)
    }
    const listen = (entityAdmin: EntityAdmin) => {
      log.info("debugger attached")
      _unsub = poll(entityAdmin.view)
    }

    if (typeof target === "string") {
      // TODO: Set up WebSocket connection with remote entity admin
    } else if (target) {
      listen(target)
    } else {
      INTERNAL_entityAdminAdded.once(listen)
      _unsub = () => INTERNAL_entityAdminAdded.unsubscribe(listen)
    }

    return () => _unsub()
  }, [target])

  const api: NetEcsContext = {
    attach,
    view,
    log,
  }

  useImperativeHandle(ref, () => api)

  return (
    <netEcsContext.Provider value={api}>
      {props.children}
    </netEcsContext.Provider>
  )
})

export function useNetECS() {
  return useContext(netEcsContext)
}
