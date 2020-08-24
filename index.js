const migrate = require('./lib/utils/migrate.js')
const config = require('./lib/config.js')

const {app, start} = require('./lib/bootstrap.js')

require('./lib/utils/logger.js')(app)
require('./lib/utils/atomic.js')(app)

migrate(() => {
  start(config.http.port)
  console.log(`Listening on http://localhost:${config.http.port}`)
})
