export class ObjectPropertyMap<T extends object = object> {
  private map = new WeakMap<object, Map<PropertyKey, any>>()

  private properties(index: T) {
    return (this.map.has(index) || this.map.set(index, new Map())) && this.map.get(index)!
  }

  get<U>(object: T, index: PropertyKey, init: () => U) {
    const ps = this.properties(object)
    return (ps.has(index) || ps.set(index, init())) && <U>ps.get(index)!
  }
}
