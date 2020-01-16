import { $stack_pool_debug_heap } from "../debug"

export interface StackPool<T> {
  allocate: () => void
  retain: () => T
  release: (obj: T) => void
  [$stack_pool_debug_heap]: T[]
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
    [$stack_pool_debug_heap]: heap,
  }
}
