import { debug_$stackPoolHeap } from "../debug"

export interface StackPool<T> {
  allocate: () => void
  retain: () => T
  release: (obj: T) => void
  [debug_$stackPoolHeap]: T[]
}

export function createStackPool<T>(
  factory: () => T,
  reset: (obj: T) => T,
  size: number,
): StackPool<T> {
  const heap: T[] = []
  const allocate = () => {
    for (let i = 0; i < size; i++) {
      heap.push(factory())
    }
  }
  const retain = () => {
    if (!heap.length) {
      allocate()
    }

    return heap.pop() as T
  }
  const release = (obj: T) => {
    heap.push(reset(obj))
  }

  return {
    allocate,
    retain,
    release,
    // debug
    [debug_$stackPoolHeap]: heap,
  }
}
