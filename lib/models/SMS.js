const config = require('../config.js')
const { peanar } = require('../utils/peanar')
const expect     = require('../utils/validator.js').expect

const twilio = require('twilio')(config.twilio.sid, config.twilio.auth_token)

if (process.env.NODE_ENV === 'tests') {
  twilio.messages.create = (data, cb) => {
    cb(null, {})
  }
}

/**
 * @typedef SMSPayload
 * @property {string} to
 * @property {string} from
 * @property {string} body
 * @property {string=} mediaUrl
 */

/**
 * @param {SMSPayload} sms 
 */
async function callTwilio(sms) {
  const data = {
    to: sms.to,
    from: sms.from,
    body: sms.body,
    mediaUrl: sms.image
  }

  if (!data.mediaUrl)
    delete data.mediaUrl // Sending undefined to twilio causes issues it seems.

  try {
    const response = await twilio.messages.create(data)
    console.log('<- (Twilio-Transport) Successfully sent a message to'.magenta, sms.to.yellow)

    return response
  } catch (err) {
    console.log('<- (Twilio-Transport) Error sending SMS message to'.red, sms.to.yellow, ':', JSON.stringify(err))
  }
}

module.exports = {
  /**
   * @param {SMSPayload} sms 
   */
  send(sms, cb = () => {}) {
    expect(sms.to, 'SMS Recipient is mandatory.').not.to.be.null
  
    callTwilio(sms)
    cb()
  },
  callTwilio: peanar.job({
    handler: callTwilio,
    queue: 'sms',
    exchange: 'sms',
    error_exchange: 'sms.error',
    name: 'sendSMS'
  })
}
