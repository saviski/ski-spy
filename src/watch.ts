import AsyncStream from './stream.js'

/**
 * Preserve object ownKeys
 */
function redirectProperty(object: any, key: PropertyKey, proxy: typeof object) {
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

const spy = Symbol('spy')

/**
 * Watch changes to object properties
 * Modifies the original object to turn it into an observable
 * turns object { prop1: v1, prop2: v1, __proto__: otherObject }
 * into
 * { __proto__: Proxy({ ...object, __proto__: otherObject }) }
 * @returns async generator of [key, value] changes
 */
export async function* watch(object: any): AsyncGenerator<[PropertyKey, any], void> {
  if (spy in object) return yield* object[spy]

  const clone = Object.create(
    Object.getPrototypeOf(object),
    Object.getOwnPropertyDescriptors(object)
  )

  const repeater = new AsyncStream<[PropertyKey, any]>()

  const ownKeys = new Set<PropertyKey>(Object.keys(object))

  const proxy = new Proxy(clone, {
    set(target, property, value) {
      Reflect.set(target, property, value, object) && repeater.yield([property, value])
      if (!ownKeys.has(property)) {
        redirectProperty(object, property, proxy)
        ownKeys.add(property)
      }
      return true
    },

    // get(target, property, receiver) {
    //   const value = Reflect.get(target, property, receiver)
    //   if (sideEffectProcedures.has(value))
    //     return (...args) => {
    //       repeater.yield([<any>null, target])
    //       return value.apply(target, args)
    //     }
    //   return value
    // },
  })

  for (const key of ownKeys) redirectProperty(object, key, proxy)

  Object.setPrototypeOf(object, proxy)

  clone[spy] = repeater

  yield* repeater
}

// const sideEffectProcedures = new Set([Array.prototype.push])
