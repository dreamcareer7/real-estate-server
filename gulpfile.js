const gulp = require('gulp')
const eslint = require('gulp-eslint')
const spawn = require('child_process').spawn

gulp.task('lint', () => {
  return gulp.src(['**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format('stylish'))
})

let node
gulp.task('server', function() {
  if (node) node.kill()
  node = spawn('node', ['index.js'], {stdio: 'inherit'})
  console.log('Loading server')
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

gulp.task('default', ['lint', 'server'], function () {})

const watcher = gulp.watch('lib/**/*', ['server'])
watcher.on('change', function(event) {
  if(event.path.split('.').pop() === 'js')
    lintFile(event.path)
})

const CLIEngine = require('eslint').CLIEngine
const cli = new CLIEngine({})
const formatter = cli.getFormatter()


function lintFile(file) {
  const report = cli.executeOnFiles([file])
  console.log(formatter(report.results))
}