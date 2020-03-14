export type SignalSubscriber<E> = (event: E) => any

export class Signal<T = any, T2 = void> {
  private subscribers: SignalSubscriber<T>[] = []

  dispatch(t: T, t2: T2) {
    setTimeout(() => {
      for (const subscriber of this.subscribers) {
        subscriber(t)
      }
    }, 0)
  }

  subscribe(subscriber: SignalSubscriber<T>) {
    if (this.subscribers.indexOf(subscriber) > -1) {
      return
    }

    this.subscribers.push(subscriber)
  }

  unsubscribe(subscriber: SignalSubscriber<T>) {
    const index = this.subscribers.indexOf(subscriber)

    if (index < 0) {
      return
    }

    this.subscribers.splice(index, 1)
  }

  once(subscriber: SignalSubscriber<T>) {
    const onceSubscriber = (t: T) => {
      subscriber(t)
      this.unsubscribe(onceSubscriber)
    }

    this.subscribe(onceSubscriber)
  }
}
