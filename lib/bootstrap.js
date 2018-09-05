// var newrelic   = require('newrelic');

require('colors')

const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const compress = require('compression')

// We compress all responses if proper `Accept-Encoding` headers are set
// by requesting party.
app.use(compress())
app.use(bodyParser.json({
  limit: '25mb'
}))

// Serving public directory contents by convention.
app.use(express.static(__dirname + '/public'))

// Pretty-printing JSON responses. This is not going to cause major
// issues on production since we compress our responses.
app.set('json spaces', 2)

const middlewares = [
  'models/index.js',
  'utils/route_middleware.js',
  'auth/auth.js',
  'utils/slack.js',
  'controllers/brand.js',
  'controllers/recommendation.js',
  'controllers/user.js',
  'controllers/agent.js',
  'controllers/session.js',
  'controllers/listing.js',
  'controllers/room.js',
  'controllers/contact_list.js',
  'controllers/contact_attribute_def.js',
  'controllers/contact.js',
  'controllers/task.js',
  'controllers/touch.js',
  'controllers/message.js',
  'controllers/alert.js',
  'controllers/notification.js',
  'controllers/admin.js',
  'controllers/verification.js',
  'controllers/office.js',
  'controllers/cma.js',
  'controllers/school.js',
  'controllers/website.js',
  'controllers/payment.js',
  'controllers/domain.js',
  'controllers/form.js',
  'controllers/deal.js',
  'controllers/envelope.js',
  'controllers/activity.js',
  'controllers/analytics',
  'controllers/template',
  'controllers/email',
  'controllers/slack',
]

const load_middlewares = () => {
  middlewares.map((middleware) => require('./' + middleware)(app))
  require('./socket/index.js')(http)
  loadExternalServices(app)
}

function loadExternalServices(app) {
  const msGraph = require('./models/MSGraph')
  msGraph.redirectHandler(app)

}

process.on('unhandledRejection', (err, promise) => {
  Context.trace('Unhanled Rejection on request', err)
})

function start (port, cb) {
  load_middlewares()
  Error.autoReport = false
  app.emit('after loading routes')
  http.listen(port, cb)
}

module.exports = {app, start}