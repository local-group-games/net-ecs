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

  components.forEach(storage.register)
  entities.forEach((c, i) => storage.insert(i, c))

  let i = n
  let c = 0
  const start = Date.now()

  while (i >= 0) {
    for (let j = 0; j < queries.length; j++) {
      for (const [] of query(...queries[j]).run(storage)) {
        c++
      }
    }
    i--
  }
  const end = Date.now()

  console.log(`entities      | ${entities.length}`)
  console.log(`components    | ${components.length}`)
  console.log(`queries       | ${queries.length}`)
  console.log(`ticks         | ${n}`)
  console.log(`iter_tick     | ${c / n}`)
  console.log(`avg_tick      | ${(end - start) / n}ms`)
}
