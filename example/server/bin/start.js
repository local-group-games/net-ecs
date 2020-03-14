const { createNetEcsExampleServer } = require("../lib/index")
const server = createNetEcsExampleServer()

require("dotenv").config()

server.listen(Number(process.env.PORT))
