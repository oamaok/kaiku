const fs = require('fs')
const esbuild = require('esbuild')
const terser = require('terser')

const isProduction = process.env.NODE_ENV === 'production'

esbuild.buildSync({
  entryPoints: ['src/kaiku.ts'],
  outfile: 'dist/kaiku.js',
  define: {
    __DEBUG__: !isProduction,
  },
})

if (isProduction) {
  terser
    .minify(fs.readFileSync('dist/kaiku.js').toString(), {
      compress: {
        passes: 3,
      },
      mangle: {
        properties: {
          reserved: ['h', 'render', 'createState', 'effect'],
        },
      },
    })
    .then((minified) => {
      fs.writeFileSync('dist/kaiku.js', minified.code)
    })
}
