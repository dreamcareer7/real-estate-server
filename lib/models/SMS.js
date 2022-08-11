const PNF = require('google-libphonenumber').PhoneNumberFormat
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const fs = require('fs')
const path = require('path')
const TEMP_PATH = path.resolve(__dirname, '../../tests/temp')

const config = require('../config.js')
const { peanar } = require('../utils/peanar')
const expect = require('../utils/validator.js').expect
const Context = require('./Context')
const twilio = require('twilio')(config.twilio.sid, config.twilio.auth_token)

if (process.env.NODE_ENV === 'tests') {
  twilio.messages.create = (data) => {
    const dir = path.resolve(TEMP_PATH, 'sms', Context.get('suite'), data.to)
    try {
      fs.statSync(dir)
    } catch (ex) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(path.resolve(dir, `${Date.now()}.json`), JSON.stringify(data), {
      encoding: 'utf-8',
    })
  }
  // eslint-disable-next-line no-inner-declarations
  function cleanup(suite) {
    const rimraf = require('rimraf')
    const dir = path.resolve(TEMP_PATH, 'sms', suite)
    rimraf.sync(dir)
  }
  if (global['Run']) {
    global['Run'].on('suite done', cleanup)
    global['Run'].on('suite error', cleanup)
  }
}

/**
 * @typedef SMSPayload
 * @property {string} to
 * @property {string=} from
 * @property {string} body
 * @property {string=} image
 */

/**
 * @param {SMSPayload} sms
 */
async function callTwilio(sms) {
  expect(sms.to, 'SMS Recipient is mandatory.').not.to.be.null

  const fromNumber = phoneUtil.parse(sms.from || config.twilio.from, 'US')
  const toNumber = phoneUtil.parse(sms.to, 'US')
  const data = {
    to: phoneUtil.format(toNumber, PNF.E164),
    from: phoneUtil.format(fromNumber, PNF.E164),
    body: sms.body,
    mediaUrl: sms.image,
  }

  if (!data.mediaUrl) delete data.mediaUrl // Sending undefined to twilio causes issues it seems.

  try {
    const response = await twilio.messages.create(data)
    Context.log('<- (Twilio-Transport) Successfully sent a message to'.magenta, sms.to.yellow)

    return response
  } catch (err) {
    Context.log('<- (Twilio-Transport) Error sending SMS message to'.red, sms.to.yellow)
    throw err
  }
}

function logSmsWillSend ({ from, to, image, body }) {
  const msg = [
    from && ` From ${from}`,
    to && ` To ${to.substr(0, 4) + '***' + to.substr(-4)}`,
    image && ` (Image: ${image})`,
    body && `: ${body.replace(/\r?\n/g, '\u23CE')}`,
  ]

  console.log('[SMS]' + msg.filter(Boolean).join(''))
}

module.exports = {
  /**
   * @param {SMSPayload} sms
   */
  send(sms, cb = () => {}) {
    expect(sms.to, 'SMS Recipient is mandatory.').not.to.be.null
    module.exports.callTwilio(sms)
    logSmsWillSend(sms)
    
    cb()
  },
  callTwilio: peanar.job({
    handler: callTwilio,
    queue: 'sms',
    exchange: 'sms',
    error_exchange: 'sms.error',
    name: 'sendSMS',
  }),
}
