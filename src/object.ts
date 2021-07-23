import { AsyncEmitter } from '@ski/streams/streams.js'
import { SpyChange } from './change.js'

const spied = new WeakMap<object, AsyncEmitter>()

/**
 * Watch changes to object properties
 * Modifies the original object to turn it into an observable
 * turns object { prop1: v1, prop2: v1, __proto__: otherObject }
 * into
 * { __proto__: Proxy({ ...object, __proto__: otherObject }) }
 * @returns async generator of [key, value] changes
 */
export async function* spyObject<T extends object>(object: T): AsyncIterable<SpyChange<T>> {
  //
  if (spied.has(object)) return yield* spied.get(object)!

  const stream = new AsyncEmitter<SpyChange<T, any>>()
  const ownKeys = new Set<string | symbol>(Object.keys(object))
  const clone = Object.create(Object.getPrototypeOf(object), Object.getOwnPropertyDescriptors(object))

  const proxy = new Proxy(clone, {
    set(target, property, value, receiver) {
      const old = Reflect.get(target, property, receiver)
      value !== old && Reflect.set(target, property, value, object) && stream.yield({ target, property, old, value })
      if (!ownKeys.has(property)) {
        wrapProperty(object, property, proxy)
        ownKeys.add(property)
      }
      return true
    },

    // get(target, property, receiver) {
    //   const value = Reflect.get(target, property, receiver)
    //   if (sideEffectProcedures.has(value))
    //     return (...args) => {
    //  // ok to call before because yield promise will only resolve after
    //       this[espionage].yield([undefined, null])
    //       return value.apply(target, args)
    //     }
    //   return value
    // },
  })

  for (const key of ownKeys) wrapProperty(object, key, proxy)
  Object.setPrototypeOf(object, proxy)
  spied.set(object, stream)

  yield* stream

  //TODO: reset object if not shared
}

// TODO: const sideEffectProcedures = new Set([Array.prototype.push])

function wrapProperty(object: any, key: PropertyKey, proxy: any) {
  delete object[key] &&
    Object.defineProperty(object, key, {
      get() {
        return Reflect.get(proxy, key, this)
      },
      set(v) {
        Reflect.set(proxy, key, v, this)
      },
      enumerable: true,
      configurable: true,
    })
}
