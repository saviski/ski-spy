import { AsyncStream } from './async-stream.js'

const espionage = Symbol('espionage agent')

/**
 * Watch changes to object properties
 * Modifies the original object to turn it into an observable
 * turns object { prop1: v1, prop2: v1, __proto__: otherObject }
 * into
 * { __proto__: Proxy({ ...object, __proto__: otherObject }) }
 * @returns async generator of [key, value] changes
 */
export async function* spy(object: any): AsyncGenerator<[PropertyKey, any], void> {
  //
  if (espionage in object) return yield* object[espionage]

  const result = new AsyncStream<[PropertyKey, any]>()
  const ownKeys = new Set<PropertyKey>(Object.keys(object))
  const clone = Object.create(
    Object.getPrototypeOf(object),
    Object.getOwnPropertyDescriptors(object)
  )

  const proxy = new Proxy(clone, {
    set(target, property, value) {
      Reflect.set(target, property, value, object) && result.yield([property, value])
      if (!ownKeys.has(property)) {
        preserveOwnKey(object, property, proxy)
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

  for (const key of ownKeys) preserveOwnKey(object, key, proxy)
  Object.setPrototypeOf(object, proxy)
  clone[espionage] = result
  yield* result
}

// const sideEffectProcedures = new Set([Array.prototype.push])

function preserveOwnKey(object: any, key: PropertyKey, proxy: typeof object) {
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
