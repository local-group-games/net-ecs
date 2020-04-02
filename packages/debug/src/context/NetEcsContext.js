import { INTERNAL_entityAdminAdded } from "@net-ecs/core";
import React, { createContext, useContext, useEffect, useState } from "react";
const netEcsContext = createContext({});
export const NetEcsProvider = (props) => {
    const [view, setView] = useState();
    useEffect(() => {
        let _unsub;
        let interval;
        const poll = (viewFn) => {
            interval = setInterval(() => setView(viewFn()), 250);
            return () => clearInterval(interval);
        };
        const listen = (entityAdmin) => {
            _unsub = poll(entityAdmin.view);
        };
        if (typeof props.target === "string") {
            // TODO: Set up WebSocket connection with remote entity admin
        }
        else if (props.target) {
            listen(props.target);
        }
        else {
            INTERNAL_entityAdminAdded.once(listen);
            _unsub = () => INTERNAL_entityAdminAdded.unsubscribe(listen);
        }
        return () => _unsub();
    }, [props.target]);
    const api = {
        view,
    };
    return <netEcsContext.Provider value={api}>{props.children}</netEcsContext.Provider>;
};
export function useNetECS() {
    return useContext(netEcsContext);
}
