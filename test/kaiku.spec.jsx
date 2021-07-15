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

describe(`kaiku (KAIKU_VERSION=${process.env.KAIKU_VERSION})`, () => {
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

    buttonElem.click()
    await nextTick()

    expect(displayElem.innerHTML).toBe('The counter is at 1')
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
})
