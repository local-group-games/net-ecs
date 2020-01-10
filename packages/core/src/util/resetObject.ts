export function resetObject<T extends object>(obj: T) {
  for (const key in obj) {
    delete obj[key]
  }

  return obj
}
