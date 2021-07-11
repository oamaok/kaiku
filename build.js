const ts = require('typescript')
const esbuild = require('esbuild')

const tsconfig = require('./tsconfig.json')

const lib = tsconfig.compilerOptions.lib.map((lib) => `lib.${lib}.d.ts`)
const program = ts.createProgram(['./src/kaiku.ts'], {
  ...tsconfig.compilerOptions,
  lib,
})

const result = program.emit()

ts.getPreEmitDiagnostics(program)
  .concat(result.diagnostics)
  .forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start
      )
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      )
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      )
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  })

esbuild.buildSync({
  entryPoints: ['src/kaiku.ts'],
  outfile: 'dist/kaiku.js',
  minify: true,
})
