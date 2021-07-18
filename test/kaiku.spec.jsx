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

const { h, render, createState, effect } = getKaiku()

const nextTick = () => new Promise(process.nextTick)

let rootNode
beforeEach(() => {
  if (rootNode) document.body.removeChild(rootNode)
  rootNode = document.createElement('div')
  document.body.appendChild(rootNode)
})

describe('kaiku', () => {
  it('should render a span to body', async () => {
    const state = createState({})

    const App = () => <span id="test">Hello world!</span>

    render(<App />, state, rootNode)

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

    render(<App />, state, rootNode)

    const displayElem = document.querySelector('#display')
    const buttonElem = document.querySelector('button')

    expect(displayElem.innerHTML).toBe('The counter is at 0')
    expect(rootNode.innerHTML).toMatchSnapshot()

    buttonElem.click()
    await nextTick()

    expect(displayElem.innerHTML).toBe('The counter is at 1')
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

    render(<Component />, state, rootNode)

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

  it('should fire effect hooks properly', async () => {
    const effectCallCounter = jest.fn()

    const state = createState({
      a: 0,
      b: 0,
    })

    const App = () => {
      effect(() => {
        effectCallCounter()

        if (state.a === 2) {
          if (state.b === 2) {
            // do stuff
          }
        }
      })
      return <div />
    }

    render(<App />, state, rootNode)
    expect(effectCallCounter).toHaveBeenCalledTimes(1)

    state.a++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(2)

    // `state.b` shouldn't yet be a dependency, so the hook must not be called
    state.b++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(2)

    // `state.a` will be set to 2
    state.a++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(3)

    // `state.b` should now be a dependency
    state.b++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(4)

    // `state.a` will be set to 3
    state.a++
    await nextTick()
    expect(effectCallCounter).toHaveBeenCalledTimes(5)

    // `state.b` should once again not be a dependency
    state.b++
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

    render(<List />, state, rootNode)

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

    render(<List />, state, rootNode)

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

  it('should not exhaust call stack with MANY nested elements', () => {
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

    render(<App />, state, document.body)
  })
})
