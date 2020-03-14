import { Arguments } from "../types/util"

export function pipe<T extends (...args: any[]) => any>(
  first: T,
  ...rest: ((...args: any[]) => any)[]
) {
  return (...args: Arguments<T>) => {
    const initialValue = first(...args)
    return rest.reduce((mem, fn) => fn(mem), initialValue)
  }
}
