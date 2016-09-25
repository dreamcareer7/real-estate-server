const ascurl = require('request-as-curl')
const async = require('async')

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

const exit = () => {
  process.exit(3)
}

const slack = (messages, cb) => {
  const text = 'Unit tests failed to run on BitBucket\n' + messages.join('\n')

  Slack.send({
    channel: 'development',
    emoji: '💔',
    text: text
  }, cb)
}

module.exports = (program) => {
  enableResponse = !program.disableResponse
  Run.on('app ready', (app) => app.use(logger))

  Run.on('message', (suite, message) => {
    if (message.code !== 'test done')
      return

    const failures = message.test.messages
      .filter(m => m !== 'Passed.')

    if (failures.length < 1)
      return

    failures.forEach(m => {
      console.log(m.red)
    })

    const tasks = []

    if(program.slack)
      tasks.push(slack.bind(null, failures))

    if (program.stopOnFail)
      tasks.push(exit)

    async.series(tasks)
  })

  if (!program.keep)
    Run.on('done', process.exit)
}
