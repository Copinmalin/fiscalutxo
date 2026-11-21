import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
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
      build.onResolve({ filter: /^\.\/transport\.js$/ }, () => ({ path: resolve('src/web/browser-transport.ts') }))
    },
  }],
})

const page = await readFile(source + '/index.html', 'utf8')
const csp = `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'`
const dependencies = ['@noble/hashes', 'csv-parse', 'fflate', 'zod']
const licenses = await Promise.all(dependencies.map(async name =>
  name + '\n\n' + await readFile('node_modules/' + name + '/LICENSE', 'utf8')))
await Promise.all([
  writeFile(output + '/index.html', page.replace('<head>', '<head>\n  <meta http-equiv="Content-Security-Policy" content="' + csp + '">')),
  copyFile(source + '/style.css', output + '/style.css'),
  writeFile(output + '/.nojekyll', ''),
  writeFile(output + '/THIRD-PARTY-NOTICES.txt', licenses.join('\n\n')),
])
