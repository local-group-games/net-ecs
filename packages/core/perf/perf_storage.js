const { createStorage } = require("../dist/storage/storage")
const { query } = require("../dist/storage/query")
const { arrayOf } = require("../dist/util/array")

module.exports.run = function run() {
  let n = 100
  const storage = createStorage(100)
  const components = [
    { name: "A", schema: {} },
    { name: "B", schema: {} },
    { name: "C", schema: {} },
    { name: "D", schema: {} },
  ]
  const entities = [
    ...arrayOf(25000, () => [{ name: "A" }]),
    ...arrayOf(25000, () => [{ name: "A" }, { name: "C" }]),
    ...arrayOf(24900, () => [{ name: "B" }]),
    ...arrayOf(24900, () => [{ name: "A" }, { name: "B" }, { name: "C" }]),
    ...arrayOf(100, () => [{ name: "D" }]),
    ...arrayOf(100, () => [{ name: "B" }, { name: "D" }]),
  ]
  const queries = [
    [components[0]],
    [components[0], components[1]],
    [components[2]],
    [components[1], components[3]],
  ]

  console.log(`entities   | ${entities.length}`)
  console.log(`components | ${components.length}`)
  console.log(`queries    | ${queries.length}`)
  console.log(`ticks      | ${n}`)

  console.time("register")
  components.forEach(storage.register)
  console.timeEnd("register")

  console.time("insert")
  entities.forEach(storage.insert)
  console.timeEnd("insert")

  let i = n
  let c = 0
  const start = Date.now()

  while (i >= 0) {
    for (let j = 0; j < queries.length; j++) {
      for (const [] of query(...queries[j]).run(storage)) {
        if (i === n) c++
      }
    }
    i--
  }
  const end = Date.now()

  console.log(`averaged ${c} entities iterated per ${(end - start) / n}ms tick`)
}
