const { createNetEcsExampleServer } = require("../lib/index")
const server = createNetEcsExampleServer()

require("dotenv").config()

server.start(Number(process.env.PORT))
