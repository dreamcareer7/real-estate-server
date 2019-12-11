const config    = require('../../../config.js')
const promisify = require('../../../utils/promisify')
const request   = require('request')
const Mailgun   = require('mailgun-js')

const Email = require('../index')


const senders = {}

const mock = require('../mock')

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


const mailgunSender = async (email) => {
  const mailgun = instance(email.domain)

  if (email.attachments) {
    email.attachment = email.attachments.map(attachment => {
      return new mailgun.Attachment({
        filename: attachment.file_name,
        data: request(attachment.url)
      })
    })
  }

  email['o:tag'] = email.tags

  const { id } = await promisify(domains[email.domain])(email)

  await Email.storeId(email.id, id)

  return id
}


module.exports = mailgunSender