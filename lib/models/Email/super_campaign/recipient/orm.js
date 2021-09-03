const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  brand: {
    model: 'Brand',
    optional: true,
    enabled: false
  },
}

Orm.register('super_campaign_recipient', 'SuperCampaignRecipient', {
  getAll,
  associations
})
