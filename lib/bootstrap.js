// var newrelic   = require('newrelic');

require('colors')

const bodyParser = require('body-parser')
const express = require('express')
const app = express()
const http = require('http').Server(app)
const compress = require('compression')
const migrate = require('./utils/migrate.js')

// We compress all responses if proper `Accept-Encoding` headers are set
// by requesting party.
app.use(compress())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

// Serving public directory contents by convention.
app.use(express.static(__dirname + '/public'))

// Pretty-printing JSON responses. This is not going to cause major
// issues on production since we compress our responses.
app.set('json spaces', 2)

const middlewares = [
  'models/index.js',
  'auth/auth.js',
  'utils/route_middleware.js',
  'utils/slack.js',
  'utils/intercom.js',
  'controllers/recommendation.js',
  'controllers/user.js',
  'controllers/agent.js',
  'controllers/session.js',
  'controllers/listing.js',
  'controllers/room.js',
  'controllers/contact.js',
  'controllers/message.js',
  'controllers/alert.js',
  'controllers/invitation.js',
  'controllers/media.js',
  'controllers/notification.js',
  'controllers/admin.js',
  'controllers/verification.js',
  'controllers/tag.js',
  'controllers/transaction.js',
  'controllers/important_date.js',
  'controllers/task.js',
  'controllers/office.js',
  'controllers/cma.js',
  'controllers/branch.js',
  'controllers/calendar.js',
  'controllers/brand.js',
  'controllers/school.js'
]

const load_middlewares = () => {
  middlewares.map((middleware) => require('./' + middleware)(app))
  require('./socket/index.js')(http)
}

function setup (cb) {
  const listen = http.listen

  app.listen = function () {
    migrate(() => {
      load_middlewares()
      app.emit('after loading routes')
      listen.apply(http, arguments)

      if(cb)
        cb()
    })
  }

  return app
}

module.exports = setup
