const jasmine = require('jasmine-node')
const async = require('async')

global.frisby = require('frisby')
global.results = {}

frisby.globalSetup({
  timeout: 30000,
  request: {
    json: true,
    baseUri: process.argv[3],
    headers: {}
  }
})

const runFrisbies = function (tasks) {
  const runF = function (task, cb) {
    const f = task.fn((err, res) => {
      if (res.body)
        global.results[task.suite][task.name] = res.body

      cb(err, res)
    })

    f.current.outgoing.headers['x-suite'] = process.argv[2]
    f.current.outgoing.headers['x-original-suite'] = task.suite
    f.current.outgoing.headers['x-test-name'] = task.name
    f.current.outgoing.headers['x-test-description'] = f.current.describe

    f.toss()
  }

  async.forEachSeries(tasks, runF)
}

const prepareTasks = function () {
  const frisbies = []
  global.registerSuite = (suite, tests) => {
    const fns = require('./suites/' + suite + '.js')

    if (!results[suite])
      results[suite] = {}

    Object.keys(fns)
    .filter((name) => (!tests || tests.indexOf(name) > -1))
    .map((name) => {
      frisbies.push({
        suite: suite,
        name: name,
        fn: fns[name]
      })
    })

    return fns
  }

  registerSuite('authorize')
  registerSuite(process.argv[2])

  return frisbies
}

function reportData (test) {
  const results = test.results()

  const data = {
    name: test.getFullName(),
    description: test.description,
    total: results.totalCount,
    passed: results.passedCount,
    failed: results.failedCount,
    messages: []
  }

  results.items_.forEach((item) => {
    if (item.failedCount < 1)
      return

    item.items_.forEach((err) => {
      data.messages.push(err.message)
    })
  })

  process.send({
    code: 'test done',
    test: data
  })
}

function setupJasmine () {
  const jasmineEnv = jasmine.getEnv()
  jasmineEnv.updateInterval = 250

  const reporter = new jasmine.JsApiReporter()

  reporter.reportSuiteResults = reportData
  reporter.reportRunnerResults = process.exit

  jasmineEnv.addReporter(reporter)

  jasmineEnv.execute()
}

runFrisbies(prepareTasks())
setupJasmine()
