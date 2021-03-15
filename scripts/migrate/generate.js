const fs = require('fs')
const path = require('path')

const TEMPLATE = fs.readFileSync(path.resolve('./scripts/migrate/template.js'), { encoding: 'utf-8' })
const TO_REPLACE = `'DO SOMETHING',
  'DO SOMETHING ELSE',
  'EVEN DO MORE'`

/**
 * @param {string} fileContents
 */
function extract(fileContents) {
  return fileContents.split(/\s*;\s+/)
}

/**
 * @param {string} item 
 */
function format(item) {
  const multiline = item.includes('\n')
  const QUOTE = multiline ? '`' : '\''

  if (multiline) {
    item = item.replace(/\n/g, '\n  ')
  }

  return QUOTE + item + QUOTE
}

/**
 * @param {string[]} paths
 */
function generate(paths) {
  return paths
    .flatMap((p) => extract(fs.readFileSync(p, { encoding: 'utf-8' })))
    .map(format)
    .join(',\n  ')
}

function render(items) {
  return TEMPLATE.replace(TO_REPLACE, items)
}

/**
 * @param {string[]} args 
 */
function parseArgs(args) {
  const idx = args.indexOf('--', 1)
  if (idx < 0) {
    return [args.join('-')]
  }

  const files = args.slice(idx + 1).map(a => path.resolve(`./lib/sql/${a}.sql`))
  return [
    Date.now().toString() + '_' + args.slice(0, idx).join('-'),
    ...files
  ]
}

function main() {
  const args = process.argv.slice(2)
  const [migration, ...paths] = parseArgs(args)
  if (paths.length < 1) {
    console.log('No files to generate a migration from. Use:\n\n    npm run migrate:generate ' + args.join(' '))
    return
  }

  const items = generate(paths)
  const content = render(items)
  
  fs.writeFileSync(path.resolve(`./migrations/${migration}.js`), content, { encoding: 'utf-8' })
}

main()
