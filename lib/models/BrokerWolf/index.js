const config = require('../../config').brokerwolf
const moment = require('moment')
const crypto = require('crypto')

BrokerWolf = {}

require('./members')
require('./classifications')
require('./property-types')
require('./contact-types')

if (process.env.NODE_ENV === 'tests')
  require('./mock.js')

BrokerWolf.tokenize = options => {
  if (!options.headers)
    options.headers = {}

  const date = moment().utc().format('YYYY-MM-DD-HH-mm-ss-SSS[Z]')

  const body = options.body ? JSON.stringify(options.body) : ''

  const md5 = crypto.createHash('md5').update(body).digest('base64')

  const signature = `${options.method}:${options.uri}:${date}:${md5}`

  const hashed = crypto.createHmac('sha256', config.secretkey).update(signature).digest('hex')

  const auth = `LoneWolfToken ${config.apitoken}:${config.clientcode}:${hashed}:${date}`


  options.headers['Authorization'] = auth
  options.headers['Content-MD5'] = md5

  options.url = `${config.host}${options.uri}`

  delete options.uri

  return options
}
