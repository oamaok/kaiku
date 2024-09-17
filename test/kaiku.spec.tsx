import * as kaiku from '../src/kaiku'

const isDevVersion = process.env.KAIKU_VERSION === 'development'

const getKaiku = () => {
  switch (process.env.KAIKU_VERSION) {
    case 'minified':
      return require('../dist/kaiku.min.js')
    case 'development':
      return require('../dist/kaiku.dev.js')
    default:
      throw new Error('Invalid KAIKU_VERSION')
  }
}

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */

const getStack = () => {
  try {
    throw new Error()
  } catch (err) {
    return (err as any).stack
      .split('\n')
      .map((v: string) => v.trim())
      .slice(2)
  }
}

const {
  h,
  Fragment,
  render,
  createState,
  useEffect,
  useState,
  useRef,
  Component,
  immutable,
} = getKaiku() as {
  h: typeof kaiku.h
  Fragment: typeof kaiku.Fragment
  Component: typeof kaiku.Component
  render: typeof kaiku.render
  createState: typeof kaiku.createState
  useEffect: typeof kaiku.useEffect
  useState: typeof kaiku.useState
  useRef: typeof kaiku.useRef
  immutable: typeof kaiku.immutable
}

const nextTick = () => new Promise(process.nextTick)

let rootNode: HTMLDivElement
let secondRootNode: HTMLDivElement
beforeEach(() => {
  ;[rootNode, secondRootNode].forEach((node) => {
    if (node) document.body.removeChild(node)
  })
  ;[rootNode, secondRootNode] = [
    document.createElement('div'),
    document.createElement('div'),
  ]
  ;[rootNode, secondRootNode].forEach((node) => {
    document.body.appendChild(node)
  })
})

const domManipulations = {
  addEventListener: jest.spyOn(Element.prototype, 'addEventListener'),
  removeEventListener: jest.spyOn(Element.prototype, 'removeEventListener'),
  createElement: jest.spyOn(document, 'createElement'),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('kaiku', () => {
  it('should handle state with null values', () => {
    const state = createState({ foo: null })
  })

  it('should render a span to body', async () => {
    const App = () => <span id="test">Hello world!</span>

    render(<App />, rootNode)

    const span = document.getElementById('test')

    expect(span).toBeDefined()
    expect(span?.innerHTML).toBe('Hello world!')
  })

  it('should update a simple counter', async () => {
    const state = createState({
      foo: 0,
    })

    const CounterDisplay = () => (
      <span id="display">The counter is at {state.foo}</span>
    )
    const IncreaseButton = () => (
      <button onClick={() => state.foo++}>Add one!</button>
    )
    const App = () => (
      <div className="app">
        <CounterDisplay />
        <IncreaseButton />
      </div>
    )

    render(<App />, rootNode)

    const displayElem = document.querySelector('#display')
    const buttonElem = document.querySelector('button')

    expect(displayElem!.innerHTML).toBe('The counter is at 0')
    expect(rootNode.innerHTML).toMatchSnapshot()

    buttonElem!.click()
    await nextTick()

    expect(displayElem!.innerHTML).toBe('The counter is at 1')
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should update a simple counter using local state', async () => {
    const Counter = () => {
      const local = useState({ counter: 0 })
      return (
        <div>
          <span>The counter is at {local.counter}</span>
          <button onClick={() => local.counter++}>Add one!</button>
        </div>
      )
    }

    render(<Counter />, rootNode)

    const displayElem = document.querySelector('span')
    const buttonElem = document.querySelector('button')

    expect(displayElem!.innerHTML).toBe('The counter is at 0')
    expect(rootNode.innerHTML).toMatchSnapshot()

    buttonElem!.click()
    await nextTick()

    expect(displayElem!.innerHTML).toBe('The counter is at 1')
    expect(rootNode.innerHTML).toMatchSnapshot()

    buttonElem!.click()
    await nextTick()

    expect(displayElem!.innerHTML).toBe('The counter is at 2')
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should only update dependant attributes without re-render', async () => {
    const propUpdateCounter = jest.fn()
    const reRenderCounter = jest.fn()

    const state = createState({ name: 'foo' })

    const Component = () => {
      reRenderCounter()

      return (
        <div
          id="test"
          name={() => {
            propUpdateCounter()
            return state.name
          }}
        />
      )
    }

    render(<Component />, rootNode)

    const element = document.querySelector('#test')

    expect(propUpdateCounter).toHaveBeenCalledTimes(1)
    expect(reRenderCounter).toHaveBeenCalledTimes(1)
    expect(element!.getAttribute('name')).toBe('foo')

    state.name = 'bar'
    await nextTick()

    expect(propUpdateCounter).toHaveBeenCalledTimes(2)
    expect(reRenderCounter).toHaveBeenCalledTimes(1)
    expect(element!.getAttribute('name')).toBe('bar')
  })

  it('should support multiple render roots', async () => {
    const state = createState({
      forFirst: { foo: 'yes' },
      forSecond: { foo: 'yes' },
    })

    const firstAppRenderCounter = jest.fn()
    const secondAppRenderCounter = jest.fn()

    const FirstApp = () => {
      firstAppRenderCounter()
      return <span id="test1">{state.forFirst.foo}</span>
    }
    const SecondApp = () => {
      secondAppRenderCounter()
      return <span id="test2">{state.forSecond.foo}</span>
    }

    render(<FirstApp />, rootNode)
    render(<SecondApp />, secondRootNode)

    const span1 = document.getElementById('test1')
    const span2 = document.getElementById('test2')

    expect(span1!.innerHTML).toBe('yes')
    expect(span2!.innerHTML).toBe('yes')
    expect(firstAppRenderCounter).toHaveBeenCalledTimes(1)
    expect(secondAppRenderCounter).toHaveBeenCalledTimes(1)

    state.forFirst.foo = 'no'
    await nextTick()
    expect(span1!.innerHTML).toBe('no')
    expect(span2!.innerHTML).toBe('yes')
    expect(firstAppRenderCounter).toHaveBeenCalledTimes(2)
    expect(secondAppRenderCounter).toHaveBeenCalledTimes(1)

    state.forSecond.foo = 'maybe'
    await nextTick()
    expect(span1!.innerHTML).toBe('no')
    expect(span2!.innerHTML).toBe('maybe')
    expect(firstAppRenderCounter).toHaveBeenCalledTimes(2)
    expect(secondAppRenderCounter).toHaveBeenCalledTimes(2)

    state.forFirst = { foo: 'totally different' }
    state.forSecond = { foo: 'bruhaha' }
    await nextTick()
    expect(span1!.innerHTML).toBe('totally different')
    expect(span2!.innerHTML).toBe('bruhaha')
    expect(firstAppRenderCounter).toHaveBeenCalledTimes(3)
    expect(secondAppRenderCounter).toHaveBeenCalledTimes(3)
  })

  it('should properly call unsubcribe function of an effect if returned', async () => {
    const effectCallCounter = jest.fn()
    const effectUnsubscribeCallCounter = jest.fn()

    const state = createState({ a: 0 })

    const App = () => {
      useEffect(() => {
        effectCallCounter()
        if (state.a === 1) {
          return effectUnsubscribeCallCounter
        }
      })

      return <div />
    }

    render(<App />, rootNode)

    expect(effectCallCounter).toHaveBeenCalledTimes(1)
    expect(effectUnsubscribeCallCounter).toHaveBeenCalledTimes(0)

    state.a++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(2)
    expect(effectUnsubscribeCallCounter).toHaveBeenCalledTimes(0)

    state.a++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(3)
    expect(effectUnsubscribeCallCounter).toHaveBeenCalledTimes(1)

    state.a++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(4)
    expect(effectUnsubscribeCallCounter).toHaveBeenCalledTimes(1)
  })

  it('should properly call unsubscribe function of an effect if surrounding component unmounts', async () => {
    const state = createState({
      obj: { a: true },
    })

    const cleanupFunctionCallCounter = jest.fn()

    const Child = () => {
      useEffect(() => {
        return () => {
          cleanupFunctionCallCounter()
        }
      })

      return <div>child</div>
    }

    const App = () => {
      return <div>{state.obj.a && <Child />}</div>
    }

    render(<App />, rootNode)
    expect(cleanupFunctionCallCounter).toHaveBeenCalledTimes(0)

    state.obj.a = false
    await nextTick()
    expect(cleanupFunctionCallCounter).toHaveBeenCalledTimes(1)
  })

  it('should fire useEffect hooks properly', async () => {
    const effectCallCounter = jest.fn()

    const state = createState({
      a: 0,
      b: 0,
      c: 0,
    })

    const App = () => {
      useEffect(() => {
        effectCallCounter()

        if (state.a === 2) {
          if (state.b === 2) {
            // do stuff
          }
        }
      })
      return <div>{state.c}</div>
    }

    render(<App />, rootNode)
    expect(effectCallCounter).toHaveBeenCalledTimes(1)

    // Updating `state.c` shouldn't affect things, so let's litter them around
    state.c++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(1)

    state.a++
    state.c++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(2)

    // `state.b` shouldn't yet be a dependency, so the hook must not be called
    state.b++
    state.c++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(2)

    // `state.a` will be set to 2
    state.a++
    state.c++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(3)

    // `state.b` should now be a dependency
    state.b++
    state.c++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(4)

    // `state.a` will be set to 3
    state.a++
    state.c++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(5)

    // `state.b` should once again not be a dependency
    state.b++
    state.c++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(5)
  })

  it('should fire useEffect hooks properly when called outside a component', async () => {
    const externalEffectCallTracker = jest.fn()
    const externalCleanupCallTracker = jest.fn()

    const state = createState({
      a: 0,
    })

    useEffect(() => {
      externalEffectCallTracker(state.a)
      return externalCleanupCallTracker
    })

    expect(externalEffectCallTracker).toHaveBeenNthCalledWith(1, 0)

    state.a++
    await nextTick()

    expect(externalEffectCallTracker).toHaveBeenNthCalledWith(2, 1)
    expect(externalCleanupCallTracker).toHaveBeenCalledTimes(1)

    state.a++
    await nextTick()

    expect(externalEffectCallTracker).toHaveBeenNthCalledWith(3, 2)
    expect(externalCleanupCallTracker).toHaveBeenCalledTimes(2)
  })

  it('should handle updates in an array efficiently', async () => {
    const listRenderCounter = jest.fn()
    const itemRenderCounter = jest.fn()

    const state = createState({
      list: Array(10)
        .fill(null)
        .map((_, i) => ({
          key: i,
          name: 'Hello, I am item number ' + i,
          condition: i < 5,
        })),
    })

    const Item = ({ item, key }: { item: any; key: any }) => {
      itemRenderCounter(item)
      return <div>{item.name}</div>
    }

    const List = () => {
      listRenderCounter()
      return (
        <div>
          {state.list
            .filter((item: any) => item.condition)
            .map((item: any) => (
              <Item key={item.key} item={item} />
            ))}
        </div>
      )
    }

    render(<List />, rootNode)

    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(5)
    expect(rootNode.innerHTML).toMatchSnapshot()

    // Since this item hasn't been rendered yet, nothing should re-render
    state.list[9].name = 'My name just changed'
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(5)
    expect(rootNode.innerHTML).toMatchSnapshot()

    // This item has been rendered, but the `.name` field is only used
    // in the <Item /> component. The <List /> component should not re-render.
    state.list[2].name = "I'm changing my name aswell!"
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(6)
    expect(rootNode.innerHTML).toMatchSnapshot()

    // Changing the condition of a previously unrendered item should trigger a
    // render in the <List /> component as well.
    state.list[5].condition = true
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(2)
    expect(itemRenderCounter).toHaveBeenCalledTimes(7)
    expect(rootNode.innerHTML).toMatchSnapshot()

    // Should re-render the list component after re-order
    const item = state.list[0]
    state.list[0] = state.list[4]
    state.list[4] = item
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(3)
    expect(itemRenderCounter).toHaveBeenCalledTimes(7)
    expect(rootNode.innerHTML).toMatchSnapshot()

    // Removing list items should not trigger re-renders in the items
    state.list[0].condition = false
    state.list[1].condition = false
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(4)
    expect(itemRenderCounter).toHaveBeenCalledTimes(7)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle updates in an array within a lazy child efficiently', async () => {
    const listRenderCounter = jest.fn()
    const itemRenderCounter = jest.fn()

    const state = createState({
      list: Array(10)
        .fill(null)
        .map((_, i) => ({
          key: i,
          name: 'Hello, I am item number ' + i,
          condition: i < 5,
        })),
    })

    const Item = ({ item }: { item: any; key: any }) => {
      itemRenderCounter(item)
      return <div>{item.name}</div>
    }

    const List = () => {
      listRenderCounter()
      return (
        <div>
          {() => (
            <div>
              {state.list
                .filter((item: any) => item.condition)
                .map((item: any) => (
                  <Item key={item.key} item={item} />
                ))}
            </div>
          )}
        </div>
      )
    }

    render(<List />, rootNode)

    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(5)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.list[9].name = 'My name just changed'
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(5)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.list[2].name = "I'm changing my name aswell!"
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(6)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.list[5].condition = true
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(7)
    expect(rootNode.innerHTML).toMatchSnapshot()

    const item = state.list[0]
    state.list[0] = state.list[4]
    state.list[4] = item
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(7)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.list[0].condition = false
    state.list[1].condition = false
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(7)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should only run effect dependant of a prop if the component body does not depend on it', async () => {
    const componentRenderCounter = jest.fn()
    const effectCallCounter = jest.fn()
    const appRenderCounter = jest.fn()

    const state = createState({ value: 'foo' })

    const Component = (props: { value: string }) => {
      useEffect(() => {
        if (props.value) {
          effectCallCounter()
        }
      })

      componentRenderCounter()

      return <div />
    }

    const App = () => {
      appRenderCounter()
      return <Component value={state.value} />
    }

    render(<App />, rootNode)

    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(effectCallCounter).toHaveBeenCalledTimes(1)
    expect(appRenderCounter).toHaveBeenCalledTimes(1)

    state.value = 'bar'
    await nextTick()
    // Component doesn't re-render but the effect is called
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(effectCallCounter).toHaveBeenCalledTimes(2)
    expect(appRenderCounter).toHaveBeenCalledTimes(2)

    // No changes if the value remains the same
    state.value = 'bar'
    await nextTick()
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(effectCallCounter).toHaveBeenCalledTimes(2)
    expect(appRenderCounter).toHaveBeenCalledTimes(2)

    state.value = 'foo'
    await nextTick()
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(effectCallCounter).toHaveBeenCalledTimes(3)
    expect(appRenderCounter).toHaveBeenCalledTimes(3)
  })

  it("should only update lazy prop within a component if only the lazy prop is dependant on the component's prop", async () => {
    const componentRenderCounter = jest.fn()
    const propCallCounter = jest.fn()
    const appRenderCounter = jest.fn()

    const state = createState({ value: 'foo' })

    const Component = (props: { value: string }) => {
      componentRenderCounter()

      return (
        <div
          id={() => {
            propCallCounter()
            return props.value
          }}
        />
      )
    }

    const App = () => {
      appRenderCounter()
      return <Component value={state.value} />
    }

    render(<App />, rootNode)

    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(propCallCounter).toHaveBeenCalledTimes(1)
    expect(appRenderCounter).toHaveBeenCalledTimes(1)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.value = 'bar'
    await nextTick()
    // Component doesn't re-render but the prop update is called
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(propCallCounter).toHaveBeenCalledTimes(2)
    expect(appRenderCounter).toHaveBeenCalledTimes(2)
    expect(rootNode.innerHTML).toMatchSnapshot()

    // No changes if the value remains the same
    state.value = 'bar'
    await nextTick()
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(propCallCounter).toHaveBeenCalledTimes(2)
    expect(appRenderCounter).toHaveBeenCalledTimes(2)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.value = 'foo'
    await nextTick()
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(propCallCounter).toHaveBeenCalledTimes(3)
    expect(appRenderCounter).toHaveBeenCalledTimes(3)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should be able to inject raw HTML', async () => {
    const App = () => {
      return <div html="<div>foo<span>bar</span></div>" />
    }

    render(<App />, rootNode)

    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should update lazy props efficiently', async () => {
    const listRenderCounter = jest.fn()
    const itemRenderCounter = jest.fn()
    const propUpdateCounter = jest.fn()

    const state = createState({
      list: Array(10)
        .fill(null)
        .map((_, i) => ({
          key: i,
          borderThicc: 0,
          condition: i < 5,
        })),
    })

    const Item = ({ item }: any) => {
      itemRenderCounter(item)
      return (
        <div
          style={{
            borderWidth: () => {
              propUpdateCounter()
              return item.borderThicc + 'px'
            },
          }}
        />
      )
    }

    const List = () => {
      listRenderCounter()
      return (
        <div id="list">
          {state.list
            .filter((item: any) => item.condition)
            .map((item: any) => (
              <Item key={item.key} item={item} />
            ))}
        </div>
      )
    }

    render(<List />, rootNode)

    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(5)
    expect(propUpdateCounter).toHaveBeenCalledTimes(5)
    expect(rootNode.innerHTML).toMatchSnapshot()

    // Updating the border thickness of a single element should
    // not trigger any re-renders, since the property is lazy
    state.list[0].borderThicc = 10
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(1)
    expect(itemRenderCounter).toHaveBeenCalledTimes(5)
    expect(propUpdateCounter).toHaveBeenCalledTimes(6)
    expect(rootNode.innerHTML).toMatchSnapshot()

    // Removing the item should not trigger the prop to update
    state.list[0].condition = false
    await nextTick()
    expect(listRenderCounter).toHaveBeenCalledTimes(2)
    expect(itemRenderCounter).toHaveBeenCalledTimes(5)
    expect(propUpdateCounter).toHaveBeenCalledTimes(6)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should not refire previous lazy props if component re-renders', async () => {
    const lazyCallCounter = jest.fn()
    const componentRenderCounter = jest.fn()

    const state = createState({ a: 0, b: 0 })

    const App = () => {
      componentRenderCounter()

      return (
        <div
          id={() => {
            lazyCallCounter()
            return state.b
          }}
        >
          {state.a}
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(lazyCallCounter).toHaveBeenCalledTimes(1)

    state.a++
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
    expect(componentRenderCounter).toHaveBeenCalledTimes(2)
    expect(lazyCallCounter).toHaveBeenCalledTimes(2)

    state.b++
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
    expect(componentRenderCounter).toHaveBeenCalledTimes(2)
    // If this changes to 4, the previous instance of the lazy property update
    // was somehow incorrectly called.
    expect(lazyCallCounter).toHaveBeenCalledTimes(3)
  })

  it.skip('should not exhaust call stack with MANY nested elements', async () => {
    const state = createState({ amount: 10000 })

    const RecursiveComponent = ({ n }: any) => {
      if (n === 0) {
        return <div>I am the final child!</div>
      }

      return <RecursiveComponent n={n - 1} />
    }

    const App = () => {
      return <RecursiveComponent n={state.amount} />
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.amount = 1
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should support conditional classNames', async () => {
    const state = createState({ foo: false })

    const App = () => (
      <div
        id="test"
        className={['always-here', { 'sometimes-here': state.foo }]}
      />
    )

    render(<App />, rootNode)

    const element = document.querySelector('#test')
    expect(element!.className).toBe('always-here')

    state.foo = true
    await nextTick()
    expect(element!.className).toBe('always-here sometimes-here')
  })

  it('should support lazy conditional classNames', async () => {
    const state = createState({ foo: false })

    const App = () => (
      <div
        id="test"
        className={() => ['always-here', { 'sometimes-here': state.foo }]}
      />
    )

    render(<App />, rootNode)

    const element = document.querySelector('#test')
    expect(element!.className).toBe('always-here')

    state.foo = true
    await nextTick()
    expect(element!.className).toBe('always-here sometimes-here')
  })

  it('should support multiple conditional classNames', async () => {
    const state = createState({ foo: false })

    const App = () => (
      <div
        id="test"
        className={() => [
          'always-here',
          { 'sometimes-here': state.foo, 'also-here': state.foo },
          { 'you-didnt-expect-me-to-be-here': state.foo },
        ]}
      />
    )

    render(<App />, rootNode)

    const element = document.querySelector('#test')
    expect(element!.className).toBe('always-here')

    state.foo = true
    await nextTick()
    expect(element!.className).toBe(
      'always-here sometimes-here also-here you-didnt-expect-me-to-be-here'
    )
  })

  it('should handle changing rootNode.firstChild', async () => {
    const state = createState({ foo: false })

    const SpanChild = () => <span>Hello, I am a span tag!</span>
    const DivChild = () => <div>Hello, I am a div tag!</div>

    const App = () => (state.foo ? <SpanChild /> : <DivChild />)

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.foo = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it("should handle component changing it's return tag", async () => {
    const state = createState({ foo: false })

    const Component = () =>
      state.foo ? (
        <span>Hello, I am a span tag!</span>
      ) : (
        <div>Hello, I am a div tag!</div>
      )

    const App = () => (
      <div>
        <Component />
      </div>
    )

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.foo = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle changing child type', async () => {
    const state = createState({ a: true })

    const App = () => <div id="app">{state.a ? 'text' : <b>bold text</b>}</div>

    render(<App />, rootNode)

    for (let i = 0; i < 50; i++) {
      state.a = !state.a
      await nextTick()
      expect(document.querySelector('#app')!.innerHTML).toEqual(
        state.a ? 'text' : '<b>bold text</b>'
      )
    }
  })

  it('should handle multiple array children in different positions', () => {
    const App = () => (
      <>
        <div>
          {[0, 1, 2, 3]}
          <span>foo</span>
          {['a', 'b', 'c', 'd']}
        </div>
        <div>
          <h2>foo</h2>
          {[]}
          <button>bar</button>
        </div>
        <div>
          <h2>foo</h2>
          {[]}
          {[]}
          {[<span>foobar</span>]}
          {[]}
          {[]}
          {[]}
          {[]}
          {[]}
          <button>bar</button>
        </div>
        <div>
          <h2>foo</h2>
          {[]}
          {[]}
          {[<span>foobar</span>]}
          {[]}
          {[]}
          {[<div>foobar</div>]}
          {[]}
          {[]}
          <button>bar</button>
        </div>
      </>
    )

    render(<App />, rootNode)

    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle function expressions as children', async () => {
    const App = () => (
      <div>
        {() => <span>Hello</span>}
        {() => <span>world!</span>}
      </div>
    )

    render(<App />, rootNode)

    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle lazy children efficiently', async () => {
    const componentRenderCounter = jest.fn()
    const lazyDivCallCounter = jest.fn()
    const lazySpanCallCounter = jest.fn()

    const state = createState({ div: 0, span: 0 })

    const App = () => {
      componentRenderCounter()

      return (
        <div>
          {() => {
            lazyDivCallCounter()
            return <div>My counter is at {state.div}</div>
          }}
          {() => {
            lazySpanCallCounter()
            return <span>My counter is at {state.span}</span>
          }}
        </div>
      )
    }

    render(<App />, rootNode)

    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(lazySpanCallCounter).toHaveBeenCalledTimes(1)
    expect(lazyDivCallCounter).toHaveBeenCalledTimes(1)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.div++
    await nextTick()
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(lazySpanCallCounter).toHaveBeenCalledTimes(1)
    expect(lazyDivCallCounter).toHaveBeenCalledTimes(2)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.span++
    await nextTick()
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(lazySpanCallCounter).toHaveBeenCalledTimes(2)
    expect(lazyDivCallCounter).toHaveBeenCalledTimes(2)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.span++
    state.span++
    state.span++
    state.span++

    state.div++
    state.div++
    state.div++
    state.div++
    await nextTick()
    expect(componentRenderCounter).toHaveBeenCalledTimes(1)
    expect(lazySpanCallCounter).toHaveBeenCalledTimes(3)
    expect(lazyDivCallCounter).toHaveBeenCalledTimes(3)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle refs and related effect calls', async () => {
    const firstEffectCall = jest.fn()
    const secondEffectCall = jest.fn()
    const thirdEffectCall = jest.fn()

    const state = createState({ value: 'second' })

    const App = () => {
      const firstRef = useRef<HTMLDivElement>()
      const secondRef = useRef<HTMLDivElement>()

      useEffect(() => {
        firstEffectCall(firstRef.current?.innerHTML)
      })

      useEffect(() => {
        secondEffectCall(secondRef.current?.innerHTML)
      })

      useEffect(() => {
        thirdEffectCall(
          firstRef.current?.innerHTML,
          secondRef.current?.innerHTML
        )
      })

      return (
        <div>
          <div ref={firstRef}>first</div>
          <div ref={secondRef}>{state.value}</div>
        </div>
      )
    }

    render(<App />, rootNode)
    await nextTick()

    expect(firstEffectCall).toHaveBeenCalledTimes(2)
    expect(firstEffectCall).toHaveBeenNthCalledWith(1, undefined)
    expect(firstEffectCall).toHaveBeenNthCalledWith(2, 'first')

    expect(secondEffectCall).toHaveBeenCalledTimes(2)
    expect(secondEffectCall).toHaveBeenNthCalledWith(1, undefined)
    expect(secondEffectCall).toHaveBeenNthCalledWith(2, 'second')

    expect(thirdEffectCall).toHaveBeenCalledTimes(2)
    expect(thirdEffectCall).toHaveBeenNthCalledWith(1, undefined, undefined)
    expect(thirdEffectCall).toHaveBeenNthCalledWith(2, 'first', 'second')

    // Changes into the element contents shouldn't trigger ref changes
    state.value = 'I changed!'
    await nextTick()

    expect(firstEffectCall).toHaveBeenCalledTimes(2)
    expect(secondEffectCall).toHaveBeenCalledTimes(2)
    expect(thirdEffectCall).toHaveBeenCalledTimes(2)
  })

  it('should handle class components', async () => {
    class App extends Component<{}, { counter: number }> {
      state = { counter: 0 }

      render() {
        return (
          <div>
            <span>Counter is at {this.state.counter}</span>
            <button onClick={() => this.state.counter++}>Increase</button>
          </div>
        )
      }
    }

    render(<App />, rootNode)

    expect(rootNode.innerHTML).toMatchSnapshot()

    const button = rootNode.querySelector('button')
    button!.click()
    await nextTick()

    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should be able to access this.props', async () => {
    class App extends Component<any, any> {
      render() {
        return <div>{this.props.value}</div>
      }
    }

    render(<App value="hello" />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should call componentDidMount only once', async () => {
    const state = createState({ ticker: 0 })
    const componentDidMountCall = jest.fn()

    class App extends Component {
      ref: any = {}

      componentDidMount() {
        componentDidMountCall(this.ref.current.innerHTML)
      }

      render() {
        return <div ref={this.ref}>{state.ticker}</div>
      }
    }

    render(<App />, rootNode)

    expect(componentDidMountCall).toHaveBeenCalledWith('0')

    state.ticker++
    await nextTick()

    expect(componentDidMountCall).toHaveBeenCalledTimes(1)
  })

  it('should call componentWillUnmount', async () => {
    const state = createState({ ticker: 0 })

    const componentDidMountCall = jest.fn()
    const componentWillUnmountCall = jest.fn()

    class ClassComponent extends Component {
      componentDidMount() {
        componentDidMountCall()
      }

      componentWillUnmount() {
        componentWillUnmountCall()
      }

      render() {
        return null
      }
    }

    const App = () => {
      return state.ticker === 0 ? <ClassComponent /> : null
    }

    render(<App />, rootNode)

    expect(componentDidMountCall).toHaveBeenCalledTimes(1)
    expect(componentWillUnmountCall).toHaveBeenCalledTimes(0)

    state.ticker++
    await nextTick()

    expect(componentDidMountCall).toHaveBeenCalledTimes(1)
    expect(componentWillUnmountCall).toHaveBeenCalledTimes(1)
  })

  it('should render fragments perfectly', async () => {
    const App = () => (
      <>
        <span>Hello</span>
        <span>world!</span>
      </>
    )

    render(<App />, rootNode)

    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle fragments being unmounted', async () => {
    const state = createState({ renderFragments: true })
    const App = () => (
      <div>
        {state.renderFragments ? (
          <>
            <span>Hello</span>
            <span>world!</span>
          </>
        ) : null}
      </div>
    )

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.renderFragments = false
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.renderFragments = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle nested components mounting and unmounting', async () => {
    const state = createState({
      a: false,
      b: false,
    })

    const A = () => <div>Hello world</div>
    const B = () => {
      if (state.a) return <A />
      return null
    }
    const C = () => {
      if (state.b) return <B />
      return null
    }
    const App = () => {
      return (
        <div>
          <C />
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.a = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.b = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.a = false
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.a = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.b = false
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.a = false
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle updates with Object.keys', async () => {
    const state = createState({
      obj: {} as Record<string, string>,
    })

    const App = () => {
      const keys = Object.keys(state.obj)

      return (
        <div>
          {keys.map((key) => (
            <span>{state.obj[key]}</span>
          ))}
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.obj.a = 'foo'
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.obj.b = 'bar'
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.obj.b = 'foobar'
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    delete state.obj.a
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.obj.a = 'barfoo'
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should not rerender a component depending on Object.keys unless the keys actually change', async () => {
    const state = createState({
      obj: { a: undefined as undefined | string },
    })

    const reRenderCounter = jest.fn()

    const App = () => {
      reRenderCounter()
      const keys = Object.keys(state.obj)

      return (
        <div>
          {keys.map((key) => (
            <span>{key}</span>
          ))}
        </div>
      )
    }

    render(<App />, rootNode)
    expect(reRenderCounter).toHaveBeenCalledTimes(1)

    state.obj.a = 'foo'
    await nextTick()
    expect(reRenderCounter).toHaveBeenCalledTimes(1)
  })

  it('should return an automatically correctly bound function when referring to function members in wrapped objects', async () => {
    const state = createState({
      obj: {
        a: function () {
          return this.b
        },
        b: 666,
      },
    })

    const bValueTracker = jest.fn()

    const App = () => {
      // Do we actually want to be creating new bound functions every time this is evaluated?
      const bGetter = state.obj.a
      const bValue = bGetter()
      bValueTracker(bValue)

      return <div>{bValue}</div>
    }

    render(<App />, rootNode)
    expect(bValueTracker).toHaveBeenCalledWith(666)
  })

  it('should re-run dependent effects if one effect updates the dependency', async () => {
    const firstEffectCounter = jest.fn()
    const secondEffectCounter = jest.fn()

    const state = createState({
      a: 0,
    })

    useEffect(() => {
      firstEffectCounter()

      // Dependency to state.a
      Object.assign({}, { a: state.a })
    })

    useEffect(() => {
      secondEffectCounter()

      if (state.a === 0) {
        state.a++
      } else if (state.a === 1) {
        state.a++
      }
    })

    expect(firstEffectCounter).toHaveBeenCalledTimes(1)
    expect(secondEffectCounter).toHaveBeenCalledTimes(1)

    await nextTick()
    expect(firstEffectCounter).toHaveBeenCalledTimes(3)
    expect(secondEffectCounter).toHaveBeenCalledTimes(3)

    // No further calls expected
    await nextTick()
    expect(firstEffectCounter).toHaveBeenCalledTimes(3)
    expect(secondEffectCounter).toHaveBeenCalledTimes(3)
  })

  it('should remove an attribute if value is set to undefined', async () => {
    const state = createState({
      elemId: 'foo' as string | undefined,
    })

    const App = () => {
      return <div id={state.elemId} />
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.elemId = undefined
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.elemId = 'bar'
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.elemId = undefined
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should toggle attributes for certain boolean attributes', async () => {
    const state = createState({
      disabled: false,
      selected: false,
      checked: false,
    })

    const App = () => {
      return (
        <div>
          <input type="text" disabled={state.disabled} />
          <input type="checkbox" checked={state.disabled} />
          <select>
            <option selected={state.selected}></option>
          </select>
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.disabled = true
    state.selected = true
    state.checked = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.disabled = false
    state.selected = false
    state.checked = false
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.disabled = true
    state.selected = true
    state.checked = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle updates to input value', async () => {
    const state = createState({
      inputValue: '',
    })

    const App = () => {
      return (
        <div>
          <input
            type="text"
            value={state.inputValue}
            onChange={(evt: any) => {
              state.inputValue = evt.target.value
            }}
          />
        </div>
      )
    }

    render(<App />, rootNode)
    const inputElem = document.querySelector('input')
    expect(inputElem!.value).toBe('')

    state.inputValue = 'foobar'
    await nextTick()
    expect(inputElem!.value).toBe('foobar')
  })

  it('should not run effects of unmounted components', async () => {
    const effectCounter = jest.fn()
    const unsubCounter = jest.fn()
    const state = createState({
      isCompMounted: true,
      counter: 0,
    })

    const Comp = () => {
      useEffect(() => {
        effectCounter(state.counter)
        return unsubCounter
      })

      return <div />
    }

    const App = () => {
      return <div>{state.isCompMounted ? <Comp /> : null}</div>
    }

    render(<App />, rootNode)
    expect(effectCounter).toHaveBeenCalledTimes(1)
    expect(unsubCounter).toHaveBeenCalledTimes(0)

    state.counter++
    await nextTick()
    expect(effectCounter).toHaveBeenCalledTimes(2)
    expect(unsubCounter).toHaveBeenCalledTimes(1)

    state.isCompMounted = false
    await nextTick()
    expect(effectCounter).toHaveBeenCalledTimes(2)
    expect(unsubCounter).toHaveBeenCalledTimes(2)

    state.counter++
    await nextTick()
    expect(effectCounter).toHaveBeenCalledTimes(2)
    expect(unsubCounter).toHaveBeenCalledTimes(2)
  })

  it('should set `ref.current` to `undefined` once HTML element unmounts', async () => {
    const effectCounter = jest.fn()
    const state = createState({ isDivMounted: false })

    const App = () => {
      const ref = useRef()

      useEffect(() => {
        effectCounter(ref.current)
      })

      return (
        <div>
          {state.isDivMounted ? (
            <div ref={ref} id="el">
              foo
            </div>
          ) : null}
        </div>
      )
    }

    render(<App />, rootNode)
    expect(effectCounter).toHaveBeenCalledTimes(1)
    expect(effectCounter).toHaveBeenCalledWith(undefined)

    state.isDivMounted = true
    await nextTick()
    expect(effectCounter).toHaveBeenCalledTimes(2)
    expect(effectCounter).toHaveBeenCalledWith(rootNode.querySelector('#el'))

    state.isDivMounted = false
    await nextTick()
    expect(effectCounter).toHaveBeenCalledTimes(3)
    expect(effectCounter).toHaveBeenCalledWith(undefined)
  })

  it('should handle changes in element event handlers', async () => {
    const handlerA = jest.fn()
    const handlerB = jest.fn()
    const state = createState({ handler: 'a' })

    const App = () => {
      return (
        <button onClick={state.handler === 'a' ? handlerA : handlerB}>
          i am a button
        </button>
      )
    }

    render(<App />, rootNode)
    expect(handlerA).toHaveBeenCalledTimes(0)
    expect(handlerB).toHaveBeenCalledTimes(0)

    const button = document.querySelector('button')!
    button.click()

    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerB).toHaveBeenCalledTimes(0)

    state.handler = 'b'
    await nextTick()
    button.click()

    expect(handlerA).toHaveBeenCalledTimes(1)
    expect(handlerB).toHaveBeenCalledTimes(1)

    expect(domManipulations.addEventListener).toHaveBeenCalledTimes(1)
  })

  it('should remove event listener if handler is set to falsey value', async () => {
    const state = createState({ hasHandler: true })
    const noop = () => {}
    const App = () => {
      return (
        <button onClick={state.hasHandler ? noop : null}>i am a button</button>
      )
    }

    render(<App />, rootNode)
    expect(domManipulations.addEventListener).toHaveBeenCalledTimes(1)
    expect(domManipulations.removeEventListener).toHaveBeenCalledTimes(0)

    state.hasHandler = false
    await nextTick()

    expect(domManipulations.addEventListener).toHaveBeenCalledTimes(1)
    expect(domManipulations.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('should unmount children of DOM elements', async () => {
    const state = createState({ isMounted: true })
    const App = () => {
      return state.isMounted ? (
        <div>
          <span>hello</span>
        </div>
      ) : (
        <div></div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.isMounted = false
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should react to state changes if key is a symbol', async () => {
    const key = Symbol()
    const state = createState({ [key]: true })
    const App = () => {
      return <div>{state[key] ? 'true' : 'false'}</div>
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state[key] = false
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should not react to changes in immutable state objects', async () => {
    const state = createState({ imm: immutable({ foo: 'bar', bar: 'foo' }) })
    const App = () => {
      return <div>{state.imm.foo}</div>
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.imm.foo = 'not bar anymore'
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should add dependency if `in` statement is used', async () => {
    const state = createState({ obj: {} as Record<string, any> })
    const App = () => {
      return <div>{'key' in state.obj ? 'true' : 'false'}</div>
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.obj.key = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should not call lazy prop updates after element has unmounted', async () => {
    const propCallCounter = jest.fn()

    const state = createState({ isMounted: true, counter: 0 })
    const App = () => {
      return (
        <div>
          {state.isMounted ? (
            <div
              id={() => {
                propCallCounter()
                return `id-${state.counter}`
              }}
            />
          ) : null}
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()
    expect(propCallCounter).toHaveBeenCalledTimes(1)

    state.counter++
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
    expect(propCallCounter).toHaveBeenCalledTimes(2)

    state.isMounted = false
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
    expect(propCallCounter).toHaveBeenCalledTimes(2)

    state.counter++
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
    expect(propCallCounter).toHaveBeenCalledTimes(2)
  })

  it('should mount elements next to function components with no children', async () => {
    const NullComponent = () => null
    const App = () => {
      return (
        <div>
          <div>foo</div>
          <NullComponent />
          <div>bar</div>
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should allow mounting multiple null components next to each other', async () => {
    const NullComponent = () => null
    const App = () => {
      return (
        <div>
          <NullComponent />
          <NullComponent />
          <NullComponent />
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should allow mounting function component next to null component', async () => {
    const NullComponent = () => null
    const Component = () => <div />
    const App = () => {
      return (
        <div>
          <Component />
          <NullComponent />
          <NullComponent />
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should allow mounting fragment next to null component', async () => {
    const NullComponent = () => null
    const App = () => {
      return (
        <div>
          <NullComponent />
          <>foo</>
          <NullComponent />
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })
  ;(isDevVersion ? it : it.skip)(
    'should throw an error if duplicate keys are found',
    async () => {
      const keys = ['a', 'b', 'c', 'a']
      const App = () => {
        return (
          <div>
            {keys.map((k) => (
              <div key={k}>{k}</div>
            ))}
          </div>
        )
      }

      expect(() =>
        render(<App />, rootNode)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Duplicate key detected! Make sure no two sibling elements have the same key."`
      )
    }
  )

  it('should execute effects if another effect modifies dependency', async () => {
    const effectCounterA = jest.fn()
    const effectCounterB = jest.fn()

    const state = createState({ run: false, a: 0, b: 0 })

    useEffect(() => {
      effectCounterB()
      if (state.run && state.b < 10) {
        state.a = 10
      }
    })

    useEffect(() => {
      effectCounterA()
      if (state.run && state.a < 10) {
        state.b = 10
      }
    })

    expect(effectCounterA).toHaveBeenCalledTimes(1)
    expect(effectCounterB).toHaveBeenCalledTimes(1)

    state.run = true
    await nextTick()

    expect(effectCounterA).toHaveBeenCalledTimes(3)
    expect(effectCounterB).toHaveBeenCalledTimes(2)
  })

  it('should support recursive state objects', async () => {
    const state = createState<any>({
      obj: {},
    })

    state.obj.ref = state.obj
  })

  it('should support mutually recursive state objects', async () => {
    const state = createState<any>({
      obj1: {},
      obj2: {},
    })

    state.obj1.ref = state.obj2
    state.obj2.ref = state.obj1
  })

  it('should support fragments with keys', async () => {
    const state = createState({ arr: [0, 1, 2, 3, 4] })

    const App = () => {
      return (
        <div>
          {state.arr.map((i) => (
            <Fragment key={i}>
              <div>{i}</div>
            </Fragment>
          ))}
        </div>
      )
    }

    render(<App />, rootNode)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })
})
