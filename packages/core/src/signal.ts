export type SignalSubscriber<E> = (event: E) => any

export class Signal<T = any> {
  private subscribers: SignalSubscriber<T>[] = []

  dispatch(t: T) {
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
}
