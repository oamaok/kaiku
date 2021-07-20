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
    },
    mangle: {
      properties: {
        reserved: ['h', 'render', 'createState', 'useEffect', 'useState'],
      },
    },
  })
  .then((minified) => {
    fs.writeFileSync('dist/kaiku.min.js', minified.code)
  })
