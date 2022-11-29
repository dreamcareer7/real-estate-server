require('colors')
const gulp = require('gulp')
const eslint = require('gulp-eslint7')
const spawn = require('child_process').spawn
const { ESLint } = require('eslint')


gulp.task('lint', () => {
  return gulp.src(['**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format('stylish'))
})

let node
gulp.task('server', function(done) {
  if (node) node.kill()
  node = spawn('node', ['index.js'], {stdio: 'inherit'})
  console.log('Loading server')
  done()
  node.on('close', function (code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...')
    }
  })
})
process.on('exit', () => {
  if(node)
    node.kill()
})

gulp.task('default', gulp.parallel('lint', 'server', function () {}))


const run = async () => {
  const lint = new ESLint({})
  const formatter = await lint.loadFormatter()
  const watcher = gulp.watch('lib/**/*', gulp.parallel('server'))

  async function lintFile(file) {
    const results = await lint.lintFiles([file])

    if (results[0] && results[0].errorCount > 0)
      console.log(formatter.format(results))
    else
      console.log(file.green, 'Looks good eslint-wise'.green)
  }



  watcher.on('change', function(path) {
    process.stdout.write('\x033c')

    if(path.split('.').pop() === 'js')
      lintFile(path)
  })
}

run()

