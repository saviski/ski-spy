export type SpyChange<T = object, P extends keyof T = any> = {
  target: T
  property: P
  old?: T[P]
  value: T[P]
}
