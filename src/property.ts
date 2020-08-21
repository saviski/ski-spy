export const UNINITIALIZED = Error("UNINITIALIZED");

const uninitialized = Symbol();

/**
 *  @example
 *  let prop = new SkiProperty<number>();
 *  >> for await (let value of prop) console.log('changed', value);
 *  prop.set(20);
 *  prop.set(50);
 *  >> log: changed 50
 *
 */
export default class SkiProperty<T = any> {
  private resolveNext!: (value: T) => void;
  private promise = this.newPromise();

  constructor(public currentValue: T | typeof uninitialized = uninitialized) {
    // if (currentValue == uninitialized) {
    //   Object.defineProperty(this, 'get', {
    //     value: () => {
    //       throw UNINITIALIZED
    //     },
    //     configurable: true,
    //   })
    //   Object.defineProperty(this, 'set', {
    //     value: value => {
    //       delete this.get
    //       delete this.set
    //       this.set(value)
    //     },
    //     configurable: true,
    //   })
    // }
  }

  private newPromise() {
    return new Promise<T>((resolve) => (this.resolveNext = resolve));
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T, never, unknown> {
    if (this.currentValue !== uninitialized) yield this.currentValue;
    while (true) {
      await this.promise;
      yield <T>this.currentValue;
    }
  }

  get() {
    if (this.currentValue === uninitialized) throw UNINITIALIZED;
    return this.currentValue;
  }

  set(value: T) {
    if (value !== this.currentValue) {
      this.resolveNext((this.currentValue = value));
      this.promise = this.newPromise();
    }
    return this;
  }

  update(callback: (value: T) => T) {
    this.set(callback(this.get()));
  }
}
