import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { build } from 'esbuild'

const source = 'src/web/public'
const output = 'dist/pages'
await mkdir(output, { recursive: true })
await build({
  entryPoints: [source + '/app.js'],
  outfile: output + '/app.js',
  bundle: true,
  platform: 'browser',
  alias: { 'csv-parse/sync': 'csv-parse/browser/esm/sync' },
  target: 'es2022',
  format: 'esm',
  minify: true,
  legalComments: 'external',
  plugins: [{
    name: 'browser-transport',
    setup(build) {
      build.onResolve({ filter: /^\.\/(period|balances)\.js$/ }, args =>
        args.importer === resolve(source + '/app.js') ? { path: resolve('src/mvp', args.path.replace(/\.js$/, '.ts')) } : undefined)
      build.onResolve({ filter: /^\.\/transport\.js$/ }, () => ({ path: resolve('src/web/browser-transport.ts') }))
    },
  }],
})

const page = await readFile(source + '/index.html', 'utf8')
const scriptVersion = createHash('sha256').update(await readFile(output + '/app.js')).digest('hex').slice(0, 12)
const csp = `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'`
const licensePaths = {
  '@noble/hashes': '@noble/hashes/LICENSE',
  'csv-parse': 'csv-parse/LICENSE',
  'fflate': 'fflate/LICENSE',
  'zod': 'zod/LICENSE',
  'pdf-lib': 'pdf-lib/LICENSE.md',
  '@pdf-lib/standard-fonts': '@pdf-lib/standard-fonts/LICENSE.md',
  '@pdf-lib/upng': '@pdf-lib/upng/LICENSE',
  'pako': 'pako/LICENSE',
  'tslib': 'pdf-lib/node_modules/tslib/LICENSE.txt',
}
const licenses = await Promise.all(Object.entries(licensePaths).map(async ([name, path]) =>
  name + '\n\n' + await readFile('node_modules/' + path, 'utf8')))
await Promise.all([
  writeFile(output + '/index.html', page.replace('./app.js', './app.js?v=' + scriptVersion).replace('<head>', '<head>\n  <meta http-equiv="Content-Security-Policy" content="' + csp + '">')),
  copyFile(source + '/style.css', output + '/style.css'),
  writeFile(output + '/.nojekyll', ''),
  writeFile(output + '/THIRD-PARTY-NOTICES.txt', licenses.join('\n\n')),
])
