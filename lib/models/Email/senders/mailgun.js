const request = require('request')


const mailgunSender = async (email, mailgun) => {
  if (email.attachments) {
    email.attachment = email.attachments.map(attachment => {
      return new mailgun.Attachment({
        filename: attachment.name || '',
        data: request(attachment.url)
      })
    })
  }

  if (email.headers) {
    for(const name in email.headers) {
      email[`h:${name}`] = email.headers[name]
    }
  }

  delete email.headers
  delete email.attachments

  email['o:tag'] = email.tags

  return email
}


module.exports = mailgunSender