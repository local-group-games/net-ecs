export type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U> ? U[] : T[P]
}

export type Arguments<F extends (...args: any[]) => any> = F extends (
  ...args: infer _
) => any
  ? _
  : never
