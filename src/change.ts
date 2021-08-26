export type SpyChange<T = any, P extends keyof T = any, S = void> = {
  root?: S
  target: T
  property: P
  old?: T[P]
  value: T[P]
}

export type ChangeIterator<T, P extends keyof T, S = T> = AsyncIterator<SpyChange<T, P, S>>

export interface ChangesIterable<T, P extends keyof T, S = T> extends PromiseLike<ChangeIterator<T, P, S>> {
  [Symbol.asyncIterator](): ChangeIterator<T, P, S>
}
