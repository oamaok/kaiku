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

const getStack = () => {
  try {
    throw new Error()
  } catch (err) {
    return err.stack
      .split('\n')
      .map((v) => v.trim())
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
} = getKaiku()

const nextTick = () => new Promise(process.nextTick)

let rootNode
beforeEach(() => {
  if (rootNode) document.body.removeChild(rootNode)
  rootNode = document.createElement('div')
  document.body.appendChild(rootNode)
})

describe('kaiku', () => {
  it('should handle state with null values', () => {
    const state = createState({ foo: null })
  })

  it('should render a span to body', async () => {
    const state = createState({})

    const App = () => <span id="test">Hello world!</span>

    render(<App />, rootNode, state)

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

    render(<App />, rootNode, state)

    const displayElem = document.querySelector('#display')
    const buttonElem = document.querySelector('button')

    expect(displayElem.innerHTML).toBe('The counter is at 0')
    expect(rootNode.innerHTML).toMatchSnapshot()

    buttonElem.click()
    await nextTick()

    expect(displayElem.innerHTML).toBe('The counter is at 1')
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

    expect(displayElem.innerHTML).toBe('The counter is at 0')
    expect(rootNode.innerHTML).toMatchSnapshot()

    buttonElem.click()
    await nextTick()

    expect(displayElem.innerHTML).toBe('The counter is at 1')
    expect(rootNode.innerHTML).toMatchSnapshot()

    buttonElem.click()
    await nextTick()

    expect(displayElem.innerHTML).toBe('The counter is at 2')
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

    render(<Component />, rootNode, state)

    const element = document.querySelector('#test')

    expect(propUpdateCounter).toHaveBeenCalledTimes(1)
    expect(reRenderCounter).toHaveBeenCalledTimes(1)
    expect(element.getAttribute('name')).toBe('foo')

    state.name = 'bar'
    await nextTick()

    expect(propUpdateCounter).toHaveBeenCalledTimes(2)
    expect(reRenderCounter).toHaveBeenCalledTimes(1)
    expect(element.getAttribute('name')).toBe('bar')
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

    render(<App />, rootNode, state)

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

    render(<App />, rootNode, state)
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

  it('should handle updates in an array efficiently', async () => {
    const listRenderCounter = jest.fn()
    const itemRenderCounter = jest.fn()

    const state = createState({
      list: Array(10)
        .fill()
        .map((_, i) => ({
          key: i,
          name: 'Hello, I am item number ' + i,
          condition: i < 5,
        })),
    })

    const Item = ({ item }) => {
      itemRenderCounter(item)
      return <div>{item.name}</div>
    }

    const List = () => {
      listRenderCounter()
      return (
        <div>
          {state.list
            .filter((item) => item.condition)
            .map((item) => (
              <Item key={item.key} item={item} />
            ))}
        </div>
      )
    }

    render(<List />, rootNode, state)

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
        .fill()
        .map((_, i) => ({
          key: i,
          name: 'Hello, I am item number ' + i,
          condition: i < 5,
        })),
    })

    const Item = ({ item }) => {
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
                .filter((item) => item.condition)
                .map((item) => (
                  <Item key={item.key} item={item} />
                ))}
            </div>
          )}
        </div>
      )
    }

    render(<List />, rootNode, state)

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

  it('should update lazy props efficiently', async () => {
    const listRenderCounter = jest.fn()
    const itemRenderCounter = jest.fn()
    const propUpdateCounter = jest.fn()

    const state = createState({
      list: Array(10)
        .fill()
        .map((_, i) => ({
          key: i,
          borderThicc: 0,
          condition: i < 5,
        })),
    })

    const Item = ({ item }) => {
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
            .filter((item) => item.condition)
            .map((item) => (
              <Item key={item.key} item={item} />
            ))}
        </div>
      )
    }

    render(<List />, rootNode, state)

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

  it.skip('should not exhaust call stack with MANY nested elements', async () => {
    const state = createState({ amount: 10000 })

    const RecursiveComponent = ({ n }) => {
      if (n === 0) {
        return <div>I am the final child!</div>
      }

      return <RecursiveComponent n={n - 1} />
    }

    const App = () => {
      return <RecursiveComponent n={state.amount} />
    }

    render(<App />, rootNode, state)
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

    render(<App />, rootNode, state)

    const element = document.querySelector('#test')
    expect(element.className).toBe('always-here')

    state.foo = true
    await nextTick()
    expect(element.className).toBe('always-here sometimes-here')
  })

  it('should support lazy conditional classNames', async () => {
    const state = createState({ foo: false })

    const App = () => (
      <div
        id="test"
        className={() => ['always-here', { 'sometimes-here': state.foo }]}
      />
    )

    render(<App />, rootNode, state)

    const element = document.querySelector('#test')
    expect(element.className).toBe('always-here')

    state.foo = true
    await nextTick()
    expect(element.className).toBe('always-here sometimes-here')
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

    render(<App />, rootNode, state)

    const element = document.querySelector('#test')
    expect(element.className).toBe('always-here')

    state.foo = true
    await nextTick()
    expect(element.className).toBe(
      'always-here sometimes-here also-here you-didnt-expect-me-to-be-here'
    )
  })

  it('should handle changing rootNode.firstChild', async () => {
    const state = createState({ foo: false })

    const SpanChild = () => <span>Hello, I am a span tag!</span>
    const DivChild = () => <div>Hello, I am a div tag!</div>

    const App = () => (state.foo ? <SpanChild /> : <DivChild />)

    render(<App />, rootNode, state)
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

    render(<App />, rootNode, state)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.foo = true
    await nextTick()
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle changing child type', async () => {
    const state = createState({ a: true })

    const App = () => <div id="app">{state.a ? 'text' : <b>bold text</b>}</div>

    render(<App />, rootNode, state)

    for (let i = 0; i < 50; i++) {
      state.a = !state.a
      await nextTick()
      expect(document.querySelector('#app').innerHTML).toEqual(
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

    render(<App />, rootNode, state)

    expect(componentRenderCounter).toBeCalledTimes(1)
    expect(lazySpanCallCounter).toBeCalledTimes(1)
    expect(lazyDivCallCounter).toBeCalledTimes(1)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.div++
    await nextTick()
    expect(componentRenderCounter).toBeCalledTimes(1)
    expect(lazySpanCallCounter).toBeCalledTimes(1)
    expect(lazyDivCallCounter).toBeCalledTimes(2)
    expect(rootNode.innerHTML).toMatchSnapshot()

    state.span++
    await nextTick()
    expect(componentRenderCounter).toBeCalledTimes(1)
    expect(lazySpanCallCounter).toBeCalledTimes(2)
    expect(lazyDivCallCounter).toBeCalledTimes(2)
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
    expect(componentRenderCounter).toBeCalledTimes(1)
    expect(lazySpanCallCounter).toBeCalledTimes(3)
    expect(lazyDivCallCounter).toBeCalledTimes(3)
    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should handle refs and related effect calls', async () => {
    const firstEffectCall = jest.fn()
    const secondEffectCall = jest.fn()
    const thirdEffectCall = jest.fn()

    const state = createState({ value: 'second' })

    const App = () => {
      const firstRef = useRef()
      const secondRef = useRef()

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

    render(<App />, rootNode, state)
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
    class App extends Component {
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
    button.click()
    await nextTick()

    expect(rootNode.innerHTML).toMatchSnapshot()
  })

  it('should call componentDidMount only once', async () => {
    const state = createState({ ticker: 0 })
    const componentDidMountCall = jest.fn()

    class App extends Component {
      ref = {}

      componentDidMount() {
        componentDidMountCall(this.ref.current.innerHTML)
      }

      render() {
        return <div ref={this.ref}>{state.ticker}</div>
      }
    }

    render(<App />, rootNode, state)

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

    render(<App />, rootNode, state)

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

    render(<App />, rootNode, state)
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
      obj: {},
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

    render(<App />, rootNode, state)
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
      obj: { a: undefined },
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

    render(<App />, rootNode, state)
    expect(reRenderCounter).toHaveBeenCalledTimes(1)

    state.obj.a = 'foo'
    await nextTick()
    expect(reRenderCounter).toHaveBeenCalledTimes(1)
  })
})
