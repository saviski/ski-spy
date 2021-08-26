import { WeakMapOfMaps, AsyncStream, stream, emit } from '@ski/streams/streams.js'
import { SpyChange, ChangesIterable, ChangeIterator } from './change.js'
import { spyProperty, isInstance } from './property.js'

export type Spy<S, T, P extends keyof T, V = T[P], F = unknown> = NestedSpy<S, V, F> & ChangesIterable<T, P, S> & F

export type NestedSpy<S, T = S, F = unknown> = {
  [P in keyof T]-?: NonNullable<T[P]> extends (...args: infer A) => infer R
    ? (...args: A) => Spy<S, T, P, R, F>
    : Spy<S, T, P, T[P], F>
}

export function changes<T, P extends keyof T, S = T>(source: Spy<S, T, P>): ChangeIterator<T, P, S> {
  return source[Symbol.asyncIterator]()
}

export const then = Symbol.for('then')

const spied = new WeakMapOfMaps<object, PropertyKey, NestedSpy<any, any, any>>()

function spyNestedProxy<T extends object, S extends object, C extends Function>(
  changes: AsyncStream<SpyChange<T, any, S>>,
  run?: C
): NestedSpy<S, T, C> {
  //
  const asyncIterator = () => (run?.(changes) ?? changes)[Symbol.asyncIterator]()

  return new Proxy<any>(function dummyFunction() {}, {
    get(reference, property) {
      switch (property) {
        case 'then':
          // setTimeout(0) lets other Promises have priority executing
          return onresolved => setTimeout(onresolved, 0, asyncIterator())

        case Symbol.asyncIterator:
          return asyncIterator

        case then:
          property = 'then'

        default:
          return spied.get(reference, property, () => {
            let source: S | undefined

            console.log('spied', property)

            let propertyChanges = changes
              .trigger(({ root, value, ...p }) => {
                source = root
                console.log('trigger.', property, { root, value, ...p })
                return spyProperty(value, property)
              })
              .map(change => {
                console.log('change', change)

                return {
                  ...change,
                  root: source || (change.target as S),
                }
              })

            return spyNestedProxy(propertyChanges, run)
          })
      }
    },

    apply(_dummyfn, self, args) {
      if (run) return run.call(self, changes, ...args)

      let results = changes.map(change => ({
        ...change,
        value: (<Function>change.value).apply(change.target, args),
      }))
      return spyNestedProxy(results, run)
    },

    has(_target, _property) {
      return true
    },
  })
}

export function spyNested<S extends object>(object: S): NestedSpy<S>
export function spyNested<S extends object, T>(
  object: S,
  call?: (changes: AsyncIterable<SpyChange<unknown>>, ...args: any[]) => T
): NestedSpy<S, S, T>

export function spyNested(object: any, run?: Function) {
  return spied.get(object, '', () => {
    const initialSignal = emit<SpyChange<any, any, any>>([
      {
        root: isInstance(object) ? object : undefined,
        value: object,
        target: object,
        property: undefined,
      },
    ])

    return spyNestedProxy(initialSignal, run)
  })
}
