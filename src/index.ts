import { spyObject } from './object.js'
import { spyProperty } from './property.js'
import { SpyChange } from './change.js'
import { spyNested, NestedSpy } from './nested.js'

export * from './nested.js'
export * from './change.js'

// spyObject
export function spy<T extends object>(object: T, all: true): AsyncIterable<SpyChange<T>>

// spyNested
export function spy<T extends object, A extends any[], R>(
  object: T,
  call?: (changes: AsyncIterable<SpyChange<any, any, T>>, ...args: A) => R
): NestedSpy<T, T, (...args: A) => R>

export function spy<T extends object>(object: T): NestedSpy<T>

// spyProperty
export function spy<T extends object, K extends keyof T>(
  object: T,
  property: K,
  originalDescriptor?: PropertyDescriptor
): AsyncIterable<SpyChange<T, K>>

export function spy<T extends object>(
  object: T,
  property: PropertyKey,
  originalDescriptor?: PropertyDescriptor
): AsyncIterable<SpyChange<T>>

// implementation
export function spy(object: any, property?: PropertyKey | true | Function, descriptor?: PropertyDescriptor): any {
  return property === true
    ? spyObject(object)
    : property && typeof property != 'function'
    ? spyProperty(object, property, descriptor)
    : spyNested(object, <any>property)
}
