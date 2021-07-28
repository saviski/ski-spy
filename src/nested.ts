import { emit, MapOfMap, AsyncStream, stream } from '@ski/streams/streams.js'
import { SpyChange } from './change.js'
import { spyProperty } from './property.js'

export interface SpyChangeSource<S, T = object, P extends keyof T = any> extends SpyChange<T, P> {
  source: S
}

export type NestedSpy<S, T = S, E = unknown> = {
  [P in keyof T]-?: (T[P] extends (...args: infer A) => infer R
    ? (...args: A) => NestedSpy<S, R, E>
    : NestedSpy<S, T[P], E>) &
    AsyncIterable<SpyChangeSource<S, T, P>> &
    E
}

const skiplist = [Symbol.unscopables]

const spied = new MapOfMap<object, PropertyKey, NestedSpy<any, any, any>>()

function spyNestedProxy<T extends object, S extends object, C extends Function>(
  changes: AsyncStream<SpyChangeSource<S, T, any>>,
  call?: C
): NestedSpy<S, T, C> {
  return new Proxy<any>(new Function(), {
    get(target, property, _proxy) {
      if (property in skiplist) return target[property]
      if (property === Symbol.asyncIterator)
        return () => (call ? call.call(target, changes) : changes)[Symbol.asyncIterator]()

      return spied.get(target, property, () => {
        const spyProperties = changes.trigger(({ source, value }) =>
          stream(spyProperty(value, property)).map(result => ({ ...result, source }))
        )
        return spyNestedProxy(spyProperties, call)
      })
    },

    apply(_target, self, args) {
      if (call) return call.call(self, changes, ...args)

      let results = changes.map(change => ({
        ...change,
        value: (<Function>change.value).apply(self, args),
      }))
      return spyNestedProxy(results, call)
    },

    has(_target, _property) {
      return true
    },
  })
}

export function spyNested<S extends object>(object: S): NestedSpy<S>
export function spyNested<S extends object, T>(
  object: S,
  call?: (changes: AsyncIterable<SpyChangeSource<S, any, any>>) => T
): NestedSpy<S, S, T>
export function spyNested(object: any, call?: Function) {
  return spyNestedProxy(
    emit<SpyChangeSource<any, any, any>>({
      source: object,
      value: object,
      target: object,
      property: undefined,
    }),
    call
  )
}
