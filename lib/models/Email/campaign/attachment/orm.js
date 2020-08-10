const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  file: {
    model: 'AttachedFile',
    enabled: true
  }
}

Orm.register('email_campaign_attachment', 'EmailCampaignAttachment', {
  getAll,
  associations
})
