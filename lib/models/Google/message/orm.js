const Orm    = require('../../Orm/registry')
const Crypto = require('../../Crypto')

const { getAll } = require('./get')

const publicize = async message => {
  const uts = new Date().getTime()
  const expires_at = uts + (60 * 60 * 1000)

  if (message.has_attachments) {
    for (const attach of message.attachments) {

      const hash = encodeURIComponent(Crypto.encrypt(JSON.stringify({
        google_credential: message.google_credential,
        message_id: message.id,
        message_remote_id: message.message_id,
        attachment_id: attach.id,
        expires_at
      })))

      attach.url = `https://${process.env.API_HOSTNAME}/emails/attachments/${hash}`
      attach.type = 'google_message_attachment'
    }
  }

  return message
}


const associations = {
  campaign: {
    collection: false,
    enabled: false,
    model: 'EmailCampaign'
  }
}

Orm.register('google_message', 'GoogleMessage', {
  getAll,
  publicize,
  associations
})