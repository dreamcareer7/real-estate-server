const config = require('./lib/config.js')

const app = require('./lib/bootstrap.js')(() => {
  console.log(`Listening on http://localhost:${config.http.port}`)
})

// For dev only
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
})

require('./lib/utils/logger.js')(app)
require('./lib/utils/atomic.js')(app)

app.listen(config.http.port)
