import { suite, test } from './lib/testdeck.esm.js'
import 'chai/register-should.js'
import chai, { expect } from 'chai'
import { spy } from '../spy.js'
import spies from 'chai-spies'

chai.use(spies)

interface TestType {
  propertyA: number
  fn(v: number): string
  fn2?(v: number): { prop: number }
  deep: {
    nested: {
      property: string
    }
  }
}

@suite
export class SpyTest2 {
  testSubject!: TestType

  before() {
    this.testSubject = {
      propertyA: 1,
      fn(v: number) {
        return `result=${v}`
      },
      deep: {
        nested: {
          property: 'value',
        },
      },
    }
  }

  @test async 'deep nested properties can be watched'() {
    let changes = await spy(this.testSubject).deep.nested.property

    expect((await changes.next()).value).to.include({ value: 'value' })

    this.testSubject.deep.nested.property = 'new value'
    expect((await changes.next()).value).to.include({ value: 'new value' })
  }

  @test async 'syncronous changes to parent objects emits only the most recent change'() {
    let changes = await spy(this.testSubject).deep.nested.property
    await changes.next()

    this.testSubject.deep.nested = { property: 'value A' }
    this.testSubject.deep.nested = { property: 'value B' }
    this.testSubject.deep.nested = { property: 'value C' }
    expect((await changes.next()).value).to.include({ value: 'value C' })

    this.testSubject.deep = { nested: { property: 'value D' } }
    this.testSubject.deep = { nested: { property: 'value E' } }
    this.testSubject.deep = { nested: { property: 'value F' } }
    expect((await changes.next()).value).to.include({ value: 'value F' })
  }

  @test async 'asyncronous changes to parent objects triggers deep nested property changes'() {
    let changes = await spy(this.testSubject).deep.nested.property
    await changes.next()

    setTimeout(() => (this.testSubject.deep.nested = { property: 'value A' }), 1)

    setTimeout(() => (this.testSubject.deep = { nested: { property: 'value B' } }), 1)

    setTimeout(() => (this.testSubject.deep = { nested: { property: 'value C' } }), 1)

    expect((await changes.next()).value).to.include({ value: 'value A' })
    expect((await changes.next()).value).to.include({ value: 'value B' })
    expect((await changes.next()).value).to.include({ value: 'value C' })
  }

  @test async 'all changes are notified when listening directly to the container property changes'() {
    let changes = await spy(this.testSubject).deep.nested
    await changes.next()

    this.testSubject.deep.nested = { property: 'value A' }
    this.testSubject.deep.nested = { property: 'value B' }
    this.testSubject.deep.nested = { property: 'value C' }
    setTimeout(() => (this.testSubject.deep.nested = { property: 'value D' }), 1)

    expect((await changes.next()).value)
      .property('value')
      .eql({ property: 'value A' })

    expect((await changes.next()).value)
      .property('value')
      .eql({ property: 'value B' })

    expect((await changes.next()).value)
      .property('value')
      .eql({ property: 'value C' })

    expect((await changes.next()).value)
      .property('value')
      .eql({ property: 'value D' })
  }

  @test async 'function results can be spied'() {
    let changes = await spy(this.testSubject).fn(2)

    expect((await changes.next()).value).to.include({ value: 'result=2' })

    let fn = chai.spy(v => `newresult=${v}`)
    this.testSubject.fn = fn

    expect((await changes.next()).value).to.include({ value: 'newresult=2' })
    expect(fn).to.have.been.called.with(2)
  }

  @test async 'function deep property results can be spied'() {
    let changes = await spy(this.testSubject).fn2(5).prop

    this.testSubject.fn2 = v => ({ prop: v })

    expect((await changes.next()).value).include({ value: 5 })
  }

  @test async 'source property on deep property changes refers to the root spied object'() {
    let changes = await spy(this.testSubject).deep.nested.property
    await changes.next()

    this.testSubject.deep.nested.property = 'anything'

    expect((await changes.next()).value).to.include({ source: this.testSubject })
  }

  @test async 'class prototypes can be spied'() {
    class MyClass {
      constructor(public name) {}
      property?: number
    }

    let changes = await spy(MyClass.prototype).property

    let instance = new MyClass('instance 1')

    instance.property = 1

    const change = await changes.next()
    expect(change.value).to.include({
      value: 1,
      property: 'property',
    })
  }

  @test async 'source property on prototypes spies refers to the object instance'() {
    class MyClass {
      constructor(public name) {}
      property?: number
    }

    let changes = await spy(MyClass.prototype).property

    let instance1 = new MyClass('instance 1')
    let instance2 = new MyClass('instance 2')

    instance1.property = 1
    instance2.property = 2

    const change1 = await changes.next()
    expect(change1.value).to.include({
      source: instance1,
      target: instance1,
    })

    let change2 = await changes.next()
    expect(change2.value).to.include({
      source: instance2,
      target: instance2,
    })
  }

  @test 'calls to spy the same property returns the same spy nested object'() {
    let changes1 = spy(this.testSubject).deep.nested.property
    let changes2 = spy(this.testSubject).deep.nested.property

    expect(changes1 === changes2).to.be.true
  }

  @test.only
  async 'source property on deep property spy of prototypes to the object instance while target is the container object'() {
    class MyClass {
      constructor(public name) {}

      deep = {
        property: {
          value: 0,
          name: this.name,
        },
      }
    }

    console.clear()

    let changes = spy(MyClass.prototype).deep.property.value

    await new Promise(r => setTimeout(r, 10))

    let instance1 = new MyClass('instance 1')
    let instance2 = new MyClass('instance 2')
    let instance3 = new MyClass('instance 3')
    let instance4 = new MyClass('instance 4')

    instance1.deep.property.value = 1
    instance2.deep.property.value = 2
    instance3.deep.property.value = 3
    ;(await changes).return?.()
    instance4.deep.property.value = 4

    for await (let v of changes) console.log('notification', v)
    // expect(change1.value).to.include({
    //   source: instance1,
    //   target: instance1.deep.property,
    // })

    // let change2 = await changes.next()
    // expect(change2.value).to.include({
    //   source: instance2,
    //   target: instance2.deep.property,
    // })
  }
}
