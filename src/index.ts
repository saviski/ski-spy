import { spyObject } from './object.js'
import { spyProperty } from './property.js'
import { SpyChange } from './change.js'
import { spyNested, NestedSpy, SpyChangeSource } from './nested.js'

export * from './nested.js'
export * from './change.js'

// spyObject
export function spy<T extends object>(object: T, all: true): AsyncGenerator<SpyChange<T>, never>

// spyNested
export function spy<T extends object, U>(
  object: T,
  call?: (changes: AsyncGenerator<SpyChangeSource<T>>) => U
): NestedSpy<T, T, U>

export function spy<T extends object>(object: T): NestedSpy<T>

// spyProperty
export function spy<T extends object, K extends keyof T>(
  object: T,
  property: K,
  originalDescriptor?: PropertyDescriptor
): AsyncGenerator<SpyChange<T, K>, never>

export function spy<T extends object>(
  object: T,
  property: PropertyKey,
  originalDescriptor?: PropertyDescriptor
): AsyncGenerator<SpyChange<T>, never>

// implementation
export function spy(object: any, property?: PropertyKey | true | Function, descriptor?: PropertyDescriptor): any {
  return property === true
    ? spyObject(object)
    : property && typeof property != 'function'
    ? spyProperty(object, property, descriptor)
    : spyNested(object, <any>property)
}
