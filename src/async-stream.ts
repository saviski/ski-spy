export class AsyncStream<T = any> {
  private resolveNext!: (value: T) => void
  private promise = this.newPromise()

  private newPromise() {
    return new Promise<T>(resolve => (this.resolveNext = resolve))
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T, never, unknown> {
    while (true) yield await this.promise
  }

  yield(...values: T[]): this {
    for (const value of values) {
      this.resolveNext(value)
      this.promise = this.newPromise()
    }
    return this
  }
}
