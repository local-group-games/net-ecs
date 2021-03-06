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

export function mutableRemove<T>(arr: T[], element: T) {
  const index = arr.indexOf(element)

  if (index === -1) {
    return false
  }

  arr.splice(index, 1)

  return true
}

export function mutableEmpty(arr: any[]) {
  while (arr.length > 0) arr.pop()
}
