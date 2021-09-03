const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  brand: {
    model: 'Brand',
    enabled: false
  },
  campaign: {
    model: 'EmailCampaign',
    enabled: false
  }
}

Orm.register('super_campaign_email_campaign', 'SuperCampaignEmailCampaign', {
  getAll,
  associations
})
