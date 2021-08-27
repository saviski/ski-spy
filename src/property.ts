import { AsyncEmitter, WeakMapOfMaps } from '@ski/streams/streams.js'
import { SpyChange } from './change.js'

const spied = new WeakMapOfMaps<object, PropertyKey, AsyncIterable<SpyChange>>()

function findPropertyDescriptor(target: any, prop: PropertyKey): PropertyDescriptor {
  let descriptor: PropertyDescriptor | undefined
  let object = target
  do {
    descriptor = Object.getOwnPropertyDescriptor(object, prop)
  } while (!descriptor && (object = Object.getPrototypeOf(object)))

  return descriptor || { value: target[prop], configurable: true, enumerable: true }
}

export function isInstance(object: unknown) {
  return typeof object == 'object' && object?.constructor && object instanceof object.constructor
}

export function spyProperty<T extends object, K extends keyof T>(
  target: T,
  property: K,
  originalDescriptor = findPropertyDescriptor(target, property)
): AsyncIterable<SpyChange<T, K>> {
  //
  return asyncGenerator(spied.get(target, property, watch))

  async function* asyncGenerator(changes: AsyncEmitter<SpyChange<T, K>>) {
    if (isInstance(target) && property in target)
      yield {
        target,
        property,
        old: undefined,
        value: target[property],
      }

    yield* changes
  }

  function watch() {
    const stream = new AsyncEmitter<SpyChange<T, K>>()
    const hasGetSetter = !('value' in originalDescriptor)
    const instanceValues = new WeakMap<T, T[K]>()

    Object.defineProperty(target, property, {
      get() {
        return hasGetSetter
          ? originalDescriptor.get?.call(this)
          : instanceValues.has(this)
          ? instanceValues.get(this)
          : originalDescriptor.value
      },

      set(value: T[K]) {
        let old = this[property]

        hasGetSetter ? originalDescriptor.set!.call(this, value) : instanceValues.set(this, value)
        if (value !== old)
          stream.push({
            target: this,
            property,
            old,
            value,
          })
      },

      configurable: true,
      enumerable: true,
    })

    stream.finally(() => Object.defineProperty(target, property, originalDescriptor))

    return stream
  }
}
