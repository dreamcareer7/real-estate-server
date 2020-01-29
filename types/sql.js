const fsp = require('fs').promises
const path = require('path')

/** @returns {AsyncIterableIterator<{ filepath: string }>} */
async function* walk(dir) {
  const files = await fsp.readdir(dir)

  for (const file of files) {
    const filepath = path.join(dir, file)
    const stats = await fsp.stat(filepath)

    if (stats.isDirectory()) {
      yield* walk(filepath)
    } else if (stats.isFile()) {
      yield { filepath }
    }
  }
}

async function main() {
  const sqls = []

  for await (const { filepath } of walk(path.resolve(__dirname, '../lib/sql'))) {
    const idx = filepath.lastIndexOf('lib/sql/') + 'lib/sql/'.length
    const relativePath = filepath.substring(idx)
    const extPos = relativePath.indexOf('.')
    const ext = extPos > -1 ? relativePath.substring(extPos) : ''

    switch (ext) {
      case '.sql':
        sqls.push(relativePath.substr(0, extPos))
        break
      default:
        break
    }
  }

  const TS = 'declare type TDbSqlAddress =\n' + sqls.map(s => `  | '${s}'`).join('\n') + ';\n'
  await fsp.writeFile(path.resolve(__dirname, 'db.d.ts'), TS, { encoding: 'utf-8' })
}

main().catch(console.error.bind(console))
