const { number } = require("../dist/index")
const { createWorld } = require("../dist/world")
const { changed } = require("../dist/storage/filter")
const { arrayOf } = require("../dist/util/array")

module.exports.run = function run() {
  let n = 100
  let c = 0
  let cc = 0

  const Position = { name: "position", schema: { x: number, y: number } }
  const Velocity = { name: "velocity", schema: { x: number, y: number } }

  const tags = 8
  const components = [Position, Velocity]
  const entityData = arrayOf(100000, i => [
    [
      { name: "position", x: 0, y: 0 },
      { name: "velocity", x: i >= 500 ? 0 : 1, y: i >= 500 ? 0 : 1 },
    ],
    tags,
  ])
  const systems = [
    (data, { mut, query }) => {
      for (let [p, v] of query(Position, Velocity).run()) {
        c++
        if (v.x || v.y) {
          p = mut(p)
          p.x += v.x
          p.y += v.y
        }
      }
    },
    (data, { query }) => {
      for (let [] of query(Position).filter(changed, tags).run()) {
        cc++
      }
    },
  ]
  const world = createWorld(systems)

  components.forEach(world.register)
  const entities = entityData.map(([components, tags]) =>
    world.create(components, tags),
  )

  let i = n
  const start = Date.now()

  while (i >= 0) {
    world.tick()
    i--
  }

  const end = Date.now()

  console.log(`entities      | ${entities.length}`)
  console.log(`components    | ${components.length}`)
  console.log(`systems       | ${systems.length}`)
  console.log(`ticks         | ${n}`)
  console.log(`iter_tick     | ${(c + cc) / n}`)
  console.log(`total_changed | ${cc}`)
  console.log(`avg_tick      | ${(end - start) / n}ms`)
}
