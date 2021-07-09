import { trigger, emit, HasAsyngIterator, map } from '@ski/streams/streams.js'
import { SpyChange } from './change.js'
import { spyProperty } from './property.js'

export interface SpyChangeSource<S, T = object, P extends keyof T = any> extends SpyChange<T, P> {
  source: S
}

export type NestedSpy<S, T = S, E = unknown> = {
  [P in keyof T]-?: (T[P] extends (...args: infer A) => infer R
    ? (...args: A) => NestedSpy<S, R, E>
    : NestedSpy<S, T[P], E>) &
    HasAsyngIterator<SpyChangeSource<S, T, P>> &
    E
}

function spyNestedProxy<T extends object, S extends object, C extends Function>(
  changes: AsyncGenerator<SpyChangeSource<S, T, any>>,
  call?: C
): NestedSpy<S, T, C> {
  return <any>new Proxy(new Function(), {
    get(_target, property, _proxy) {
      if (property === Symbol.asyncIterator) return changes

      let values = trigger(changes, ({ source, value }) =>
        map(spyProperty(value, property), result => ({ ...result, source }))
      )
      return spyNestedProxy(values, call)
    },

    apply(_target, self, args) {
      if (call) {
        return call.call(self, changes, ...args)
      }

      let results = map(changes, change => ({
        ...change,
        value: (<Function>change.value).apply(self, args),
      }))
      return spyNestedProxy(results, call)
    },
  })
}

export function spyNested<S extends object>(object: S): NestedSpy<S>
export function spyNested<S extends object, T>(
  object: S,
  call?: (changes: AsyncGenerator<SpyChangeSource<S, any, any>>) => T
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
