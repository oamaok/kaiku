import { h, render, createState } from '../dist/kaiku'

const dummyState = createState({})

const nextTick = () => new Promise(process.nextTick)

let rootNode

beforeEach(() => {
  if (rootNode) document.body.removeChild(rootNode)
  rootNode = document.createElement('div')
  document.body.appendChild(rootNode)
})

describe('kaiku', () => {
  it('should render a span to body', async () => {
    const App = () => <span id="test">Hello world!</span>

    render(<App />, dummyState, rootNode)

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
})
