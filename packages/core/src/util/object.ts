export function deleteObjectProperties<T extends object>(obj: T) {
  for (const key in obj) {
    delete obj[key]
  }

  return obj
}
