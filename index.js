const throng = require('throng')
const migrate = require('./lib/utils/migrate.js')
const config = require('./lib/config.js')

const {app, start} = require('./lib/bootstrap.js')

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
