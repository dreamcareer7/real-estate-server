const spawn = require('child_process').exec
const mkdir = require('fs').mkdirSync
const aglio = require('aglio')
const fs = require('fs')
const async = require('async')

const program = require('commander')
  .option('-o, --no-tests', 'Disable running tests, only regenerate docs')
  .option('-t, --theme <theme>', 'Aglio theme to use')

const options = program.parse(process.argv)

try {
  mkdir('/tmp/rechat')
} catch (e) {
  // FIXME: What is to be done here?
}

if (options.tests) {
  const c = spawn('node ' + __dirname + '/../tests/run --docs', {
    maxBuffer: 1024 * 1000
  }, err => {
    if (err) {
      console.log(err)
      process.exit()
      return
    }

    generate()
  })

  c.stderr.pipe(process.stderr)
} else
  generate()

function generate() {
  const files = fs.readdirSync('/tmp/rechat')
    .filter(filename => {
      if (filename.substr(0,1) === '.')
        return false

      if (filename.split('.').pop() !== 'md')
        return false

      return true
    })
    .map(filename => filename.substr(0, filename.length - 3))

  const done = err => {
    if (err)
      return console.log('Error while generating docs', err)

    console.log('Done')
    process.exit()
  }

  async.map(files, generateMd, done)
}

function generateMd(docName, cb) {
  const md = fs.readFileSync(`/tmp/rechat/${docName}.md`).toString()

  aglio.render(md, {
    theme: options.theme || 'olio',
//     themeTemplate:'triple',
    themeFullWidth: true,
    includePath: '/tmp/rechat'
  }, (err, html) => {
    if (err)
      return cb(err)

    fs.writeFile(`/tmp/rechat/${docName}.html`, html, cb)
  })
}