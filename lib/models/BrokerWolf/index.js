const moment = require('moment')
const crypto = require('crypto')

BrokerWolf = {}

require('./members')
require('./classifications')
require('./property-types')
require('./contact-types')
require('./settings')

if (process.env.NODE_ENV === 'tests')
  require('./mock.js')

BrokerWolf.tokenize = async options => {
  if (!options.headers)
    options.headers = {}

  const { brand } = options

  const settings = await BrokerWolf.Settings.getByBrand(brand)

  if (!settings)
    throw new Error.Generic({
      message: `BrokerWolf settings not found for brand ${brand}`,
      code: 501
    })

  let uri = options.uri
  if (options.qs)
    uri += '?' + Object.keys(options.qs).map(key => `${key}=${options.qs[key]}`).join('&')

  const date = moment().utc().format('YYYY-MM-DD-HH-mm-ss-SSS[Z]')

  const body = options.body ? JSON.stringify(options.body) : ''

  const md5 = crypto.createHash('md5').update(body).digest('base64')

  const signature = `${options.method}:${uri}:${date}:${md5}`

  const hashed = crypto.createHmac('sha256', settings.secret_key).update(signature).digest('hex')

  const auth = `LoneWolfToken ${settings.api_token}:${settings.client_code}:${hashed}:${date}`


  options.headers['Authorization'] = auth
  options.headers['Content-MD5'] = md5

  options.url = `${settings.host}${uri}`

  delete options.uri

  return options
}
