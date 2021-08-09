const fs = require('fs')
const esbuild = require('esbuild')
const terser = require('terser')

esbuild.buildSync({
  entryPoints: ['src/kaiku.ts'],
  outfile: 'dist/kaiku.dev.js',
  define: {
    __DEBUG__: true,
  },
})

esbuild.buildSync({
  entryPoints: ['src/kaiku.ts'],
  outfile: 'dist/kaiku.min.js',
  define: {
    __DEBUG__: false,
  },
})

terser
  .minify(fs.readFileSync('dist/kaiku.min.js').toString(), {
    compress: {
      passes: 3,
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
          'state',
        ],
      },
    },
  })
  .then((minified) => {
    fs.writeFileSync('dist/kaiku.min.js', minified.code)
  })
