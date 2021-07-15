# Kaiku ![CI](https://github.com/oamaok/kaiku/actions/workflows/main.yaml/badge.svg)

Lightweight JSX-based UI framework with boilerplate-free state managament.

# Getting started

Kaiku is packaged to be easily used in both browser and as a module, no build tools required:

```html
<script src="https://unpkg.com/kaiku"></script>
<script>
  const { h, render, createState } = kaiku
  const state = createState({ greeting: 'Hello world' })

  const App = () => h('span', null, state.greeting)

  render(h(App), state, document.body)
</script>
```

Or, just install the package using your favorite package manager:

```shell
# With NPM
npm i -s kaiku

# With yarn
yarn add kaiku
```

# Example

```js
import { h, render, createState } from 'kaiku'

const state = createState({ counter: 0 })

const Counter = () => (
  <div>
    <span>Counter: {state.counter}</span>
    <button
      onClick={() => {
        state.counter++
      }}
    >
      Increment
    </button>
    <button
      onClick={() => {
        state.counter--
      }}
    >
      Decrement
    </button>
  </div>
)

render(<Counter />, state, document.body)
```

# License

```
Copyright (c) 2021 Teemu Pääkkönen

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
```
