const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('email_campaign', 'EmailCampaign', {
  getAll,
  associations: {
    emails: {
      collection: true,
      model: 'EmailCampaignEmail',
      enabled: false,
    },
  
    template: {
      model: 'TemplateInstance',
      enabled: false
    },
  
    from: {
      model(c, cb) {
        if (c.google_credential) return cb(null, 'GoogleCredential')
        if (c.microsoft_credential) return cb(null, 'MicrosoftCredential')
        return cb(null, 'User')
      },
      id(c, cb) {
        if (c.google_credential) return cb(null, c.google_credential)
        if (c.microsoft_credential) return cb(null, c.microsoft_credential)
        return cb(null, c.from)
      },
      enabled: false
    },
  
    recipients: {
      model: 'EmailCampaignRecipient',
      collection: true,
      enabled: false
    },
  
    deal: {
      model: 'Deal',
      enabled: false,
      optional: true
    },
  
    attachments: {
      model: 'EmailCampaignAttachment',
      enabled: false,
      collection: true
    }
  }
})
