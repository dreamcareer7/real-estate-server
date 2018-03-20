/**
 * @namespace Email
 */

const config = require('../config.js')
const queue = require('../utils/queue.js')

const mailgun = require('mailgun-js')({apiKey: config.mailgun.api_key, domain: config.mailgun.domain})

let send_mailgun

if (process.env.NODE_ENV === 'tests') {
  send_mailgun = (params, cb) => cb()
} else {
  const messages = mailgun.messages()
  send_mailgun = messages.send.bind(messages)
}

const Email = {
  sane(email, cb) {
    process.domain.jobs.push(queue.create('email_sane', email).removeOnComplete(true))
    return cb()
  },

  sendSane(email, cb) {
    const params = {
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text
    }

    if (email.mailgun_options)
      for (const i in email.mailgun_options)
        params[i] = email.mailgun_options[i]

    send_mailgun(params, function (err, data) {
      if (err)
        console.log('<- (Mailgun-Transport) Error sending email to'.red, email.to[0].yellow, ':', JSON.stringify(err))
      else
        console.log('<- (Mailgun-Transport) Successfully sent an email to'.cyan, email.to[0].yellow)

      return cb(null, data)
    })
  }
}

global['Email'] = Email
module.exports = Email
