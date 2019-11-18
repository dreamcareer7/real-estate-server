const config    = require('../../../config.js')
const Context   = require('../../Context')
const promisify = require('../../../utils/promisify')
const request   = require('request')

const mock    = require('../mock')
const Email   = require('../index')
const Mailgun = require('mailgun-js')


const senders = {}


const instance = sender => {
  if (process.env.NODE_ENV === 'tests')
    return mock

  if (senders[sender])
    return senders[sender]

  const c = config.mailgun[sender]
  const mailgun = Mailgun({apiKey: c.api_key, domain: c.domain})
  senders[sender] = mailgun

  return mailgun
}

const factory = sender => {
  const mailgun = instance(sender)
  const messages = mailgun.messages()
  return messages.send.bind(messages)
}

const domains = {}
domains[Email.GENERAL] = factory(Email.GENERAL)
domains[Email.MARKETING] = factory(Email.MARKETING)



const sendViaMailgun = async email => {
  const mailgun = instance(email.domain)

  email.attachment = email.attachments.map(attachment => {
    return new mailgun.Attachment({
      filename: attachment.file_name,
      data: request(attachment.url)
    })
  })

  email['o:tag'] = email.tags

  const recipient = email.to || email.cc || email.bcc

  try {
    const { id } = await promisify(domains[email.domain])(email)

    Context.log('Sent an email to'.cyan, recipient, email.id, id)

    await Email.storeId(email.id, id)

    return id
  } catch(err) {
    Context.log('<- (Mailgun-Transport) Error sending email to'.red, recipient, ':', JSON.stringify(err))
    throw err
  }
}


module.exports = sendViaMailgun