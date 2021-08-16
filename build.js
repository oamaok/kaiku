const fs = require('fs')
const esbuild = require('esbuild')
const terser = require('terser')

fs.mkdirSync('dist')
fs.copyFileSync('src/package-entry.js', 'dist/index.js')

console.log('Build development version')
console.time(' - time')
esbuild.buildSync({
  entryPoints: ['src/kaiku.ts'],
  outfile: 'dist/kaiku.dev.js',
  define: {
    __DEBUG__: true,
  },
})
console.timeEnd(' - time')

console.log('Build production version')
console.time(' - time')
esbuild.buildSync({
  entryPoints: ['src/kaiku.ts'],
  outfile: 'dist/kaiku.js',
  define: {
    __DEBUG__: false,
  },
})
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
      properties: {
        reserved: [
          'h',
          'render',
          'createState',
          'useEffect',
          'useState',
          'useRef',
          'immutable',
          'current',
          'Component',
          'componentDidMount',
          'componentWillUnmount',
          'Fragment',
          'state',
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
