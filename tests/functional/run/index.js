process.env.ORIGINAL_NODE_ENV = process.env.NODE_ENV || 'development'
process.env.NODE_ENV = 'tests' // So we read the proper config file

require('colors')

const path = require('path')
const fs = require('fs')
const program = require('commander')
const { Run } = require('./run')

const config = require('../../../lib/config.js')
const migrate = require('../../../lib/utils/migrate')
const fork = require('child_process').fork
const async = require('async')
const redis = require('redis')

const Context = require('../../../lib/models/Context')
const Notification = require('../../../lib/models/Notification')

const { installJobsRoute } = require('../jobs')
const installTestMiddlewares = require('./middlewares')

const redisClient = redis.createClient(config.redis)

const TEMP_PATH = path.resolve(__dirname, '../temp')
require('rimraf').sync(path.resolve(TEMP_PATH, 'sms'))

program
  .usage('[options] <suite> <suite>')
  .option('-s, --server <server>', 'Instead of setting your own version, run tests against <server>')
  .option('-c, --concurrency <n>', 'Number of suites to run at the same time (defaults to 20)')
  .option('--curl', 'Throw curl commands')
  .option('--report', 'Use the nice plain text reporter')
  .option('--no-response', 'When in curl mode, do not write responses to stdout')
  .option('--stop-on-fail', 'Stops on the first sight of problem')
  .option('--keep', 'Keep the server running after execution is completed')
  .option('--docs', 'Setup REST API')
  .option('--commit <suite>', 'Commits the changes on specified suite after its done')
  .parse(process.argv)

const options = program.opts()

if (!options.concurrency)
  options.concurrency = 1

if (options.docs)
  require('../docs.js')()

if (options.curl)
  require('../curl.js')(options)
else
  require('../report.js')(options)


const getSuites = function (cb) {
  if (program.args.length > 0)
    return cb(null, program.args)

  const files = fs.readdirSync(__dirname + '/suites')
  const suites = files
    .filter((file) => file.substring(file.length - 3, file.length) === '.js')
    .map((file) => file.replace('.js', ''))

  return cb(null, suites)
}

function spawnProcesses (cb) {
  getSuites((err, suites) => {
    if (err)
      return cb(err)

    suites.map((suite) => Run.emit('register suite', suite))

    async.mapLimit(suites, options.concurrency, spawnSuite, cb)
  })
}

function spawnSuite (suite, cb) {
  const url = options.server ? options.server : 'http://localhost:' + config.url.port

  const runner = fork(__dirname + '/../runner.js', [suite, url], {
    execArgv: []
  })

  Run.emit('spawn', suite)

  runner.on('message', (m) => {
    Run.emit('message', suite, m)
  })

  runner.on('suite error', (m) => {
    Run.emit('suite error', m.suite)
  })

  runner.on('exit', () => {
    Run.emit('suite done', suite)
    cb()
  })
}

const { database, rollback, connections } = require('./db')
const {app, start} = require('../../../lib/bootstrap.js')


app.use(database)

app.use((req, res, next) => {
  const newAllowedHeaders = (res.get('Access-Control-Allow-Headers') || '')
    .split(',').concat(['x-suite', 'x-handle-jobs'])
    .join(',')
  res.header('Access-Control-Allow-Headers', newAllowedHeaders)
  next()
})

app.on('after loading routes', () => {
  app.use((err, req, res, next) => {
    Context.getActive().emit('error', err)
  })
})

Run.emit('app ready', app)

const setupApp = cb => {
  migrate(() => {
    start(config.url.port, () => {
      // Clear all jobs on test db
      redisClient.flushdb(err => {
        if (err)
          console.log(err)

        Notification.schedule = function (notification, cb) {
          if (!notification.delay)
            notification.delay = 0

          setTimeout(function () {
            Notification.create(notification, cb)
          }, notification.delay)
        }

        cb()
      })
    })
  })

  if (!options.keep) {
    Run.on('suite done', (suite) => {
      if (options.commit && options.commit === suite) {
        connections[suite].query('COMMIT', err => {
          if (err)
            console.log('Error committing', err)
          else
            console.log('Committed changes')

          rollback(suite)
          return
        })
      }

      rollback(suite)
    })
  }

  installJobsRoute(app)
}

const steps = []

if (!options.server) {
  steps.push(setupApp)
  steps.push(installTestMiddlewares(app))
}

steps.push(spawnProcesses)

async.series(steps, (err) => {
  if (err) {
    console.log(err)
  }

  Run.emit('done')
})
