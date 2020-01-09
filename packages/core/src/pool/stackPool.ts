export function createStackPool<T>(factory: () => T, size: number) {
  const heap: T[] = [];
  const allocate = () => {
    for (let i = 0; i < size; i++) {
      heap.push(factory());
    }
  };
  const retain = () => {
    if (!heap.length) {
      allocate();
    }

    return heap.pop() as T;
  };
  const release = (obj: T) => heap.push(obj);

  return {
    allocate,
    retain,
    release
  };
}
