import { createEntityAdmin } from "@net-ecs/core"

export const entityAdmin = createEntityAdmin()
;(window as any).entityAdmin = entityAdmin
