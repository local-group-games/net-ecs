export function mutableRemove<T>(arr: T[], element: T) {
  const index = arr.indexOf(element);

  if (index === -1) {
    return false;
  }

  arr.splice(index, 1);

  return true;
}
