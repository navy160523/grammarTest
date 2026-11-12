import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'

const output = new URL('./dist/', import.meta.url)
const assets = await readdir(new URL('assets/', output))
const slides = await readdir(new URL('grammar-slides/', output))
const files = [
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  ...assets.sort().map(name => 'assets/' + name),
  ...slides.sort().map(name => 'grammar-slides/' + name),
]
const worker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8')
const hash = createHash('sha256').update(worker)
for (const file of files) {
  hash.update(file).update(await readFile(new URL(file, output)))
}
const version = hash.digest('hex').slice(0, 16)
await writeFile(new URL('sw.js', output),
  'const version = ' + JSON.stringify(version) + '\n' +
  'const files = ' + JSON.stringify(files) + '\n' + worker)
