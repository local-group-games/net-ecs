const { createNetEcsExampleServer } = require("../lib/index")
const server = createNetEcsExampleServer()
const tickRate = (1 / 60) * 1000

require("dotenv").config()

setInterval(() => server.world.tick(tickRate), tickRate)

server.listen(Number(process.env.PORT))
