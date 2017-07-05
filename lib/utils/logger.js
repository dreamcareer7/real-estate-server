const config = require('../config.js')
const uuid = require('node-uuid')
const redis = require('redis')
const numeral = require('numeral')

function logRequest () {
  const res = this
  const req = this.req
  let statusColor

  const id = `${req.method}_${req.path}`

  const [seconds, nanoseconds] = process.hrtime(req.start)

  const elapsed = Math.round((seconds * 1000) + (nanoseconds * 1e-6))

  Metric.set('request.elapsed', elapsed)
  Metric.set(`request.${id}.elapsed`, elapsed)

  const queries = (process.domain && process.domain.query_count) ? process.domain.query_count : null

  if (queries) {
    Metric.set('request.queries', queries)
    Metric.set(`request.${id}.queries`, queries)
  }

  if (res.statusCode < 400)
    statusColor = 'green'
  else if (res.statusCode < 500)
    statusColor = 'yellow'
  else
    statusColor = 'red'

  let elapsedColor

  if (elapsed < 200)
    elapsedColor = 'green'
  else if (elapsed < 1000)
    elapsedColor = 'yellow'
  else
    elapsedColor = 'red'

  let name
  if (req.user && req.user.type === 'user') // It could also be a session response on ClientPassword requests
    name = '(' + req.user.email + ')'
  else
    name = '(Guest)'

  let userColor
  if (!req.user)
    userColor = 'white'
  else if (req.user && req.user.email_confirmed)
    userColor = 'green'
  else
    userColor = 'red'

  const agent = req.client ? req.client.name + ' ' + req.client.version : ''

  let text = '(' + req.rechat_id.cyan + ') '
  text += (numeral(elapsed).format('0,0') + 'ms\t')[elapsedColor]
  text += 'Σ' + ((process.domain && process.domain.query_count) ? process.domain.query_count : 0) + '\t'
  text += ('HTTP ' + res.statusCode)[statusColor]
  text += (' ' + req.method + ' ' + req.url + '  ')[statusColor]
  text += name[userColor] + ' ' + (agent + ' ')
  text += req.headers['authorization'] ? req.headers['authorization'] : ''

  console.log(text)
}

const redisClient = redis.createClient(config.redis)

function saveBody (req) {
  const ct = req.headers['content-type']
  if (!ct)
    return

  if (ct.toLowerCase() !== 'application/json')
    return

  if (!req.body)
    return

  const blacklist = [
    '/oauth2/token'
  ]

  if (blacklist.indexOf(req.path) > -1)
    return

  redisClient.hset('bodies', req.rechat_id, JSON.stringify(req.body))
}

module.exports = function (app) {
  app.use(function (req, res, next) {
    req.start = process.hrtime()
    req.rechat_id = uuid.v1()
    res.setHeader('X-Request-ID', req.rechat_id)
    res.on('finish', logRequest)

    // eslint-disable-next-line callback-return
    next()
    saveBody(req)
  })
}
