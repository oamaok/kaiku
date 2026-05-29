import assert from 'node:assert'
import test from 'node:test'
import { AsyncLocalStorage } from 'node:async_hooks'
import JSDOM from 'jsdom'

const html =
  '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'
const jsdom = new JSDOM.JSDOM(html)

global.window = jsdom.window as unknown as (Window & typeof globalThis)
global.document = jsdom.window.document
global.Element = jsdom.window.Element

type MockFn = {
  (...args: any): void
  calls: any[]
}

type BaseAssertations = {
  toEqual(expected: any): void
  toBeDefined(): void
  toMatchSnapshot(): void
}

type MockFnAssertations = {
  toHaveBeenCalledTimes(expected: number): void
  toHaveBeenCalledWith(...expected: any[]): void
  toHaveBeenNthCalledWith(index: number, ...expected: any[]): void
}

type FnAssertations = {
  toThrow(message: any): void
}

type Expect<T> = (T extends MockFn
  ? MockFnAssertations
  : T extends () => unknown
  ? FnAssertations
  : BaseAssertations)

export const mockFn = (): MockFn => {
  const calls: any[] = []
  const fn = (...args: any[]) => {
    calls.push(args)
  }

  fn.calls = calls

  return fn
}

const isMockFn = (value: any): value is MockFn =>
  typeof value === 'function' && 'calls' in value

const testContextStorage = new AsyncLocalStorage<test.TestContext>()

export const expect = <T>(actual: T): Expect<T> => {
  const testContext = testContextStorage.getStore()
  assert(testContext)

  if (isMockFn(actual)) {
    return {
      toHaveBeenCalledTimes(expected: number) {
        testContext.assert.deepEqual(actual.calls.length, expected)
      },
      toHaveBeenCalledWith(...expected: any[]) {
        testContext.assert.deepEqual(actual.calls.at(-1), expected)
      },
      toHaveBeenNthCalledWith(index: number, ...expected: any[]) {
        testContext.assert.deepEqual(actual.calls.at(index - 1), expected)
      },
    } as Expect<T>
  }

  if (typeof actual === 'function') {
    return {
      toThrow(expected: any) {
        testContext.assert.throws(actual as () => unknown, expected)
      },
    } as Expect<T>
  }

  return {
    toEqual(expected: any) {
      testContext.assert.deepEqual(actual, expected)
    },
    toBeDefined() {
      testContext.assert.notEqual(actual, null)
      testContext.assert.notEqual(actual, undefined)
    },
    toMatchSnapshot() {
      testContext.assert.snapshot(actual)
    },
  } as Expect<T>
}

const createDomManipExpectation = <T extends {}, K extends keyof T>(obj: T, key: K) => {
  let count = 0
  test.beforeEach(() => {
    count = 0
  })

  const originalFn = obj[key] as (...args: any[]) => any
  obj[key] = function (...args: any[]) {
    count++

    // @ts-ignore
    return originalFn.apply(this, args)
  } as T[K]

  return {
    toHaveBeenCalledTimes(expected: number) {
      assert.equal(count, expected)
    }
  }
}

expect.dom = {
  createElement: createDomManipExpectation(document, 'createElement'),
  addEventListener: createDomManipExpectation(Element.prototype, 'addEventListener'),
  removeEventListener: createDomManipExpectation(Element.prototype, 'removeEventListener'),
} as const

export const describe = test.describe
export const beforeEach = test.beforeEach

export const it = (name: string, fn: () => void | Promise<void>) =>
  test.it(name, (t) => testContextStorage.run(t, fn))

it.skip = test.it.skip
it.only = (name: string, fn: () => void | Promise<void>) =>
  test.only(name, (t) => testContextStorage.run(t, fn))
