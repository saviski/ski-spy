export function lazyGetter<T>({
  builder,
  has = () => true,
  storage = {},
}: {
  builder: (property: string) => T
  has: (p: string) => boolean
  storage: any
}): Record<string, T> {
  return new Proxy(storage, {
    get: (_, property) =>
      storage[property] ||
      (typeof property == 'string' && has(property)
        ? (storage[property] = builder(property))
        : undefined),
  })
}
