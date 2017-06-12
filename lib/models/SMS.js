/**
 * @namespace Twilio
 */

const config = require('../config.js')
const queue = require('../utils/queue.js')

const client = require('twilio')(config.twilio.sid, config.twilio.auth_token)

if (process.env.NODE_ENV === 'tests') {
  client.sendMessage = (data, cb) => {
    cb(null, {})
  }
}

SMS = {}
Twilio = {}

SMS.send = function (sms, cb) {
  return Twilio.sendSMS(sms, cb)
}

Twilio.sendSMS = function (sms, cb) {
  process.domain.jobs.push(queue.create('sms', sms).removeOnComplete(true))
  cb()
}

Twilio.callTwilio = function (sms, cb) {
  const data = {
    to: sms.to,
    from: sms.from,
    body: sms.body,
    mediaUrl: sms.image
  }

  if (!data.mediaUrl)
    delete data.mediaUrl // Sending undefined to twilio causes issues it seems.

  client.sendMessage(data, (err, response) => {
    if (err)
      console.log('<- (Twilio-Transport) Error sending SMS message to'.red, sms.to.yellow, ':', JSON.stringify(err))
    else
      console.log('<- (Twilio-Transport) Successfully sent a message to'.magenta, sms.to.yellow)

    return cb(null, response)
  })
}

module.exports = function () {}
