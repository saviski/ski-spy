import { AsyncEmitter, MapOfMap, stream } from '@ski/streams/streams.js'
import { SpyChange } from './change.js'

const spied = new MapOfMap<object, PropertyKey, AsyncIterable<SpyChange>>()

function findPropertyDescriptor(target: any, prop: PropertyKey): PropertyDescriptor {
  let descriptor: PropertyDescriptor | undefined
  let object = target
  do {
    descriptor = Object.getOwnPropertyDescriptor(object, prop)
  } while (!descriptor && (object = Object.getPrototypeOf(object)))

  return descriptor || { value: target[prop], configurable: true, enumerable: true }
}

function isInstance(object: unknown) {
  return typeof object == 'object' && object?.constructor && object instanceof object.constructor
}

export async function* spyProperty<T extends object, K extends keyof T>(
  target: T | undefined,
  property: K,
  originalDescriptor = findPropertyDescriptor(target, property)
): AsyncIterable<SpyChange<T, K>> {
  if (!target) return

  if (isInstance(target) && property in target) {
    console.log('initial value', property, target[property])
    yield { target, property, old: undefined, value: target[property] }
  }

  yield* spied.get(target, property, () => stream(watch()))

  async function* watch() {
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
        if (value !== old) stream.yield({ target: this, property, old, value })
      },

      configurable: true,
      enumerable: true,
    })

    stream.finally(() => Object.defineProperty(target, property, originalDescriptor))

    yield* stream
  }
}
