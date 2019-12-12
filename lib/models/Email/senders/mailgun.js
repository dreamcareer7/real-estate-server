const request = require('request')


const mailgunSender = async (email, mailgun) => {
  if (email.attachments) {
    email.attachment = email.attachments.map(attachment => {
      return new mailgun.Attachment({
        filename: attachment.file_name,
        data: request(attachment.url)
      })
    })
  }

  if (email.headers)
    for(const name in email.headers)
      email[`h:${name}`] = email.headers[name]

  delete email.headers

  email['o:tag'] = email.tags
}


module.exports = mailgunSender