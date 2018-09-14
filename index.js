const throng = require('throng')
const migrate = require('./lib/utils/migrate.js')
const config = require('./lib/config.js')

const {app, start} = require('./lib/bootstrap.js')

// For dev only
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Methods', '*')
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Rechat-Brand, X-Auth-Mode, Range')
  next()
})

require('./lib/utils/logger.js')(app)
require('./lib/utils/atomic.js')(app)

const cluster = () => {
  throng({
    workers: config.cluster.workers,

    start: id => {
      start(config.http.port)
      console.log(`Listening (${id}) on http://localhost:${config.http.port}`)
    }
  })
}

const normal = () => {
  start(config.http.port)
  console.log(`Listening on http://localhost:${config.http.port}`)
}

const starter = process.argv.includes('cluster') ? cluster : normal

migrate(starter)
