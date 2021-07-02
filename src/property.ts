import { AsyncEmitter } from '@ski/streams/streams.js'
import { SpyChange } from './change.js'
import { ObjectPropertyMap } from './map.js'

const spied = new ObjectPropertyMap()

function findPropertyDescriptor(target: any, prop: PropertyKey): PropertyDescriptor {
  let desc: PropertyDescriptor | undefined
  let obj = target
  do {
    desc = Object.getOwnPropertyDescriptor(obj, prop)
  } while (!desc && (obj = Object.getPrototypeOf(obj)))

  return desc || { value: target[prop], configurable: true, enumerable: true }
}

export async function* spyProperty<T extends object, K extends keyof T = keyof T>(
  target: T | undefined,
  property: K,
  originalDescriptor = findPropertyDescriptor(target, property)
): AsyncGenerator<SpyChange<T, K>, void> {
  if (!target) return

  if (property in target) yield { target, property, old: undefined, value: target[property] }

  yield* spied.get(target, property, async function* () {
    //
    const stream = new AsyncEmitter<SpyChange<T, K>>()
    const values = new WeakMap<T, T[K]>()

    Object.defineProperty(target, property, {
      get() {
        return 'value' in originalDescriptor
          ? values.has(this)
            ? values.get(this)
            : originalDescriptor.value
          : originalDescriptor.get?.call(this)
      },

      set(value: T[K]) {
        let old = this[property]
        'value' in originalDescriptor ? values.set(this, value) : originalDescriptor.set?.call(this, value)
        value !== old && stream.yield({ target: this, property, old, value })
      },

      configurable: true,
    })

    yield* stream

    Object.defineProperty(target, property, originalDescriptor)
  })
}
