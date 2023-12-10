const fs = require('fs')
const esbuild = require('esbuild')
const terser = require('terser')

fs.mkdirSync('dist')
fs.copyFileSync('src/package-entry.js', 'dist/index.js')

const source = fs.readFileSync('./src/kaiku.ts').toString()

console.log('Build development version')
console.time(' - time')
fs.writeFileSync(
  'dist/kaiku.dev.js',
  esbuild.transformSync(source, {
    loader: 'ts',
    define: {
      __DEBUG__: true,

      ClassComponentTag: '"ClassComponent"',
      FunctionComponentTag: '"FunctionComponent"',
      HtmlElementTag: '"HtmlElement"',
      FragmentTag: '"Fragment"',
      TextNodeTag: '"TextNode"',
      EffectTag: '"EffectTag"',
      LazyPropUpdateTag: '"LazyPropUpdateTag"',
      LazyStyleUpdateTag: '"LazyStyleUpdateTag"',
    },
  }).code
)
console.timeEnd(' - time')

console.log('Build production version')
console.time(' - time')
let tagId = 0
fs.writeFileSync(
  'dist/kaiku.js',
  esbuild.transformSync(source, {
    loader: 'ts',
    define: {
      __DEBUG__: false,

      ClassComponentTag: tagId++,
      FunctionComponentTag: tagId++,
      HtmlElementTag: tagId++,
      FragmentTag: tagId++,
      TextNodeTag: tagId++,
      EffectTag: tagId++,
      LazyPropUpdateTag: tagId++,
      LazyStyleUpdateTag: tagId++,
    },
  }).code
)
console.timeEnd(' - time')

console.log('Minify production version')
console.time(' - time')
terser
  .minify(fs.readFileSync('dist/kaiku.js').toString(), {
    sourceMap: true,
    compress: {
      passes: 3,
      inline: false,
      unsafe: true,
      booleans_as_integers: true,
    },
    mangle: {
      module: true,
      properties: {
        reserved: [
          'h',
          'jsx',
          'render',
          'createState',
          'useEffect',
          'useState',
          'useRef',
          'immutable',
          'ref',
          'current',
          'Component',
          'componentDidMount',
          'componentWillUnmount',
          'Fragment',
          'state',
          'props',
        ],
      },
    },
  })
  .then((minified) => {
    minified.code += '\n//# sourceMappingURL=kaiku.min.js.map'

    fs.writeFileSync('dist/kaiku.min.js', minified.code)
    fs.writeFileSync('dist/kaiku.min.js.map', minified.map)
  })
console.timeEnd(' - time')
