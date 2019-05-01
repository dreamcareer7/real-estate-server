require('colors')
const gulp = require('gulp')
const eslint = require('gulp-eslint')
const spawn = require('child_process').spawn

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

const watcher = gulp.watch('lib/**/*', gulp.parallel('server'))

watcher.on('change', function(path) {
  process.stdout.write('\033c')

  if(path.split('.').pop() === 'js')
    lintFile(path)
})

const CLIEngine = require('eslint').CLIEngine
const cli = new CLIEngine({})
const formatter = cli.getFormatter()


function lintFile(file) {
  const report = cli.executeOnFiles([file])
  if (report.results[0] && report.results[0].errorCount > 0)
    console.log(formatter(report.results))
  else
    console.log(file.green, 'Looks good eslint-wise'.green)
}
