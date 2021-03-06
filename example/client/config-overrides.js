const path = require("path")
const { addWebpackAlias, babelInclude, override } = require("customize-cra")
const ModuleScopePlugin = require("react-dev-utils/ModuleScopePlugin")
const resolvePackageDirectory = package =>
  path.dirname(require.resolve(path.join(package, "package.json")))
const monorepoPackages = [
  "@net-ecs/core",
  "@net-ecs/debug",
  "@net-ecs/client",
  "@net-ecs/example-server",
]
const monorepoWebpackAliases = monorepoPackages.reduce((acc, packageName) => {
  acc[packageName] = path.join(resolvePackageDirectory(packageName), "src")
  return acc
}, {})

module.exports = config => {
  config.resolve.plugins = config.resolve.plugins.filter(
    plugin => !(plugin instanceof ModuleScopePlugin),
  )

  return override(
    process.env.NODE_ENV === "development" &&
      babelInclude(Object.values(monorepoWebpackAliases).concat(path.resolve("src"))),
    process.env.NODE_ENV === "development" && addWebpackAlias(monorepoWebpackAliases),
  )(config)
}
