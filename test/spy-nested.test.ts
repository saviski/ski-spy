import { suite, test } from './lib/testdeck.esm.js'
import 'chai/register-should.js'
import chai, { expect } from 'chai'
import { spy, ChangeIterator } from '../spy.js'
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
export class SpyTest {
  testSubject!: TestType

  propAChanges!: ChangeIterator<TestType, 'propertyA'>

  async before() {
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

    this.propAChanges = await spy(this.testSubject).propertyA
  }

  @test async 'it emits the initial state of the property'() {
    let change = await this.propAChanges.next()
    expect(change.value).to.include({
      property: 'propertyA',
      value: 1,
      target: this.testSubject,
    })
  }

  @test async 'the old value is not defined on initial emit'() {
    let change = await this.propAChanges.next()
    expect(change.value).to.not.have.property('old')
  }

  @test async 'change includes the name of the modified property'() {
    await this.propAChanges.next()

    this.testSubject.propertyA = 2
    let change = await this.propAChanges.next()
    expect(change.value).to.include({ property: 'propertyA' })
  }

  @test async 'change has the new value of the property modified'() {
    await this.propAChanges.next()

    this.testSubject.propertyA = 2
    let change2 = await this.propAChanges.next()
    expect(change2.value).to.include({ value: 2 })
  }

  @test
  async 'change has the old value of the property modified'() {
    await this.propAChanges.next()

    this.testSubject.propertyA = 2
    let change = await this.propAChanges.next()
    expect(change.value).to.include({ old: 1 })
  }

  @test async 'change has the object where from the property was modified'() {
    await this.propAChanges.next()

    this.testSubject.propertyA = 2
    let change = await this.propAChanges.next()
    expect(change.value).to.include({ target: this.testSubject })
  }

  @test async 'all property changes are notified'() {
    await this.propAChanges.next()

    this.testSubject.propertyA = 2
    this.testSubject.propertyA = 3
    this.testSubject.propertyA = 4

    expect((await this.propAChanges.next()).value).to.include({ value: 2 })
    expect((await this.propAChanges.next()).value).to.include({ value: 3 })
    expect((await this.propAChanges.next()).value).to.include({ value: 4 })
  }
}
