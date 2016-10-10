process.env.ORIGINAL_NODE_ENV = process.env.NODE_ENV || 'development'
process.env.NODE_ENV = 'tests' // So we read the proper config file

require('colors')

const fs = require('fs')
const program = require('commander')
const config = require('../lib/config.js')
const fork = require('child_process').fork
const async = require('async')
const EventEmitter = require('events')
const redis = require('redis')

const redisClient = redis.createClient(config.redis)

global.Run = new EventEmitter()

program
  .usage('[options] <suite> <suite>')
  .option('-d, --disable-ui', 'Disable UI and show debug output from the app')
  .option('-s, --server <server>', 'Instead of setting your own version, run tests against <server>')
  .option('-c, --concurrency <n>', 'Number of suites to run at the same time (defaults to 20)')
  .option('--curl', 'Throw curl commands (disabled ui)')
  .option('--disable-response', 'When in curl mode, do not write responses to stdout')
  .option('--stop-on-fail', 'Stops on the first sight of problem')
  .option('--keep', 'Keep the server running after execution is completed')
  .option('--docs', 'Setup REST API')
  .parse(process.argv)

if (!program.concurrency)
  program.concurrency = 1

if (program.docs) {
  program.disableUi = true
  require('./docs.js')(program)
}

if (program.curl) {
  program.disableUi = true
  require('./curl.js')(program)
}

if (!program.disableUi)
  require('./ui.js')(program)

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

    async.mapLimit(suites, program.concurrency, spawnSuite, cb)
  })
}

function spawnSuite (suite, cb) {
  const url = program.server ? program.server : 'http://localhost:' + config.tests.port

  const runner = fork(__dirname + '/runner.js', [suite, url])

  Run.emit('spawn', suite)

  runner.on('message', (m) => {
    Run.emit('message', suite, m)
  })

  runner.on('exit', () => {
    Run.emit('suite done', suite)
    cb()
  })
}

const Domain = require('domain')
const db = require('../lib/utils/db')

const connections = {}

const database = (req, res, next) => {
  const domain = Domain.create()
  const suite = req.headers['x-suite']

  let handled = false
  domain.on('error', (e) => {
    if (handled)
      return
    handled = true

    delete e.domain
    delete e.domainThrown
    delete e.domainEmitter
    delete e.domainBound

    if (!e.http)
      e.http = 500

    console.log(e)
    process.stderr.write('Error: ' + JSON.stringify(e.stack) + '\n')

    res.status(e.http)

    if (e.http >= 500)
      res.json({message: 'Internal Error'})
    else
      res.json(e)
  })

  if (connections[suite]) {
    domain.db = connections[suite]
    domain.jobs = []
    domain.jobs.push = job => job.save()
    domain.run(next)
    return
  }

  db.conn((err, conn, done) => {
    conn.done = done
    conn.query('BEGIN', (err) => {
      connections[suite] = conn
      domain.db = conn
      domain.run(next)
    })
  })
}

function setupApp (cb) {
  const app = require('../lib/bootstrap.js')()
  app.use(database)

//   Error.autoReport = false;

  if (!program.keep) {
    Run.on('suite done', (suite) => {
      connections[suite].query('ROLLBACK', connections[suite].done)
      delete connections[suite]
    })
  }

  Run.emit('app ready', app)

  app.on('after loading routes', () => {
    app.use((err, req, res, next) => {
      process.domain.emit('error', err)
    })
  })

  app.listen(config.tests.port, () => {
    // Clear all jobs on test db
    redisClient.flushall(err => {
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
}

const steps = []

if (!program.server)
  steps.push(setupApp)

steps.push(spawnProcesses)

async.series(steps, (err) => {
  if (err) {
    console.log(err)
  }

  Run.emit('done')
})
