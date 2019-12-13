const Context = require('../../../models/Context/index')
const request = require('request')


const mailgunSender = async (email, mailgun) => {
  Context.log('mailgunSender-email', email)

  if (email.attachments) {
    Context.log('mailgunSender-email attachments', email.attachments)

    email.attachment = email.attachments.map(attachment => {
      Context.log('mailgunSender-email inside-loop attachment', attachment)

      return new mailgun.Attachment({
        filename: attachment.name || '',
        data: request(attachment.url)
      })
    })
  }

  Context.log('mailgunSender-email attachments-2', email.attachments)

  if (email.headers)
    for(const name in email.headers)
      email[`h:${name}`] = email.headers[name]

  delete email.headers

  email['o:tag'] = email.tags

  Context.log('mailgunSender-email final', email)

  return email
}


module.exports = mailgunSender