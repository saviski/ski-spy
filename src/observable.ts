import SkiProperty from "./property.js";
import { lazyGetter } from "./lazy-getter.js";
import { watch } from "./watch.js";

export type ObservableObject<T> = {
  [K in keyof T]: SkiProperty<T[K]>;
};

const observerMap = new WeakMap<any, ObservableObject<any>>();

export const observers = <T extends object>(object: T): ObservableObject<T> =>
  observerMap.get(object)!;

export function observable<T extends object>(object: T): ObservableObject<T> {
  if (observerMap.has(object)) return observerMap.get(object)!;

  const storage = <ObservableObject<T>>{};
  const observable = <ObservableObject<T>>lazyGetter({
    builder: (property) => new SkiProperty(object[property]),
    has: (property) => property in object,
    storage,
  });
  listen(watch(object), ([property, value]) => {
    storage[property]?.set(value);
    console.log("listen", property, value);
  });

  observerMap.set(object, observable);
  return observable;
}

async function listen<T, U>(source: AsyncGenerator<T>, listener: (v: T) => U) {
  for await (const value of source) listener(value);
}
