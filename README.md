<p align="center">
<img src="https://raw.githubusercontent.com/oamaok/kaiku/main/misc/logo.png" height="150" />
</p>

![CI](https://github.com/oamaok/kaiku/actions/workflows/main.yaml/badge.svg)

From Finnish _kaiku_ (_/ˈkɑi̯ku/_), meaning _echo_.

A lightweight JSX-based UI framework with a freely mutable, boilerplate-free global state management.

[Try it out!](https://kaiku.dev/playground.html)

## Getting started

Kaiku is packaged to be easily used in both browser and as a module, no build tools required:

```html
<script src="https://unpkg.com/kaiku"></script>
<script>
  const { h, render, createState } = kaiku
  const state = createState({ greeting: 'Hello world' })

  const App = () => h('span', null, state.greeting)

  render(h(App), document.body, state)
</script>
```

Or, just install the package using your favorite package manager:

```shell
# With NPM
npm i -s kaiku

# With yarn
yarn add kaiku
```

## Example

A simple ticker component with global state management.

```jsx
import { h, render, createState } from 'kaiku'

const state = createState({ ticks: 0 })

const Ticker = () => (
  <div>
    <div>
      There have been <b>{state.ticks} ticks</b> since last update.
    </div>
    <button onClick={() => { state.ticks = 0 }}>Reset</button>
  </div>
)

setInterval(() => state.ticks++, 1000)

render(<Ticker />, document.body, state)
```

## Documentation

See the [official website](https://kaiku.dev/guide.html).

## License

```
Copyright (c) 2021 Teemu Pääkkönen

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
```
