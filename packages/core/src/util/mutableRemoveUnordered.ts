export function mutableRemoveUnordered<T>(arr: T[], element: T) {
  const length = arr.length
  const index = arr.indexOf(element)

  if (index === -1) {
    return false
  }

  const last = arr.pop()

  if (index < length - 1) {
    arr[index] = last as T
  }

  return true
}
