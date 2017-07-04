const ascurl = require('request-as-curl')

let enableResponse

function logger (req, res, next) {
  const end = res.end

  console.log((req.headers['x-test-description'] + ': ' + req.method + ' ' + req.path).yellow)
  res.end = function (data, encoding, callback) {
    console.log((req.headers['x-test-description'] + ': ' + req.method + ' ' + req.path).green)
    console.log(ascurl(req, req.body).cyan)

    if (enableResponse && data)
      console.log(data.toString().blue)
    end.call(res, data, encoding, callback)
  }

  next()
}

module.exports = (program) => {
  enableResponse = program.response
  Run.on('app ready', (app) => app.use(logger))

  Run.on('message', (suite, message) => {
    if (message.code !== 'test done')
      return

    if (message.test.failed < 1)
      return

    message.test.messages.forEach(m => {
      console.log(m.message.red)
    })

    if (program.stopOnFail)
      process.exit(3)
  })

  if (!program.keep)
    Run.on('done', process.exit)
}
