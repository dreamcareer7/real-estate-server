const moment = require('moment')
const crypto = require('crypto')
const Settings = require('./settings')

const tokenize = async options => {
  if (!options.headers)
    options.headers = {}

  const { brand } = options

  const settings = await Settings.getByBrand(brand)

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

module.exports = tokenize
