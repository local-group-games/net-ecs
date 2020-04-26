export type SignalSubscriber<T, T2> = (t1: T, t2: T2) => any

export class Signal<T = void, T2 = void> {
  private subscribers: SignalSubscriber<T, T2>[] = []

  dispatch(t: T, t2: T2) {
    for (const subscriber of this.subscribers) {
      subscriber(t, t2)
    }
  }

  subscribe(subscriber: SignalSubscriber<T, T2>) {
    if (this.subscribers.includes(subscriber)) {
      return
    }

    this.subscribers.push(subscriber)
  }

  unsubscribe(subscriber: SignalSubscriber<T, T2>) {
    const index = this.subscribers.indexOf(subscriber)

    if (index < 0) {
      return
    }

    this.subscribers.splice(index, 1)
  }

  once(subscriber: SignalSubscriber<T, T2>) {
    const onceSubscriber = (t: T, t2: T2) => {
      subscriber(t, t2)
      this.unsubscribe(onceSubscriber)
    }

    this.subscribe(onceSubscriber)
  }
}
