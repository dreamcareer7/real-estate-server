const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  list: {
    model: 'ContactList',
    optional: true,
    enabled: false
  },

  contact: {
    model: 'Contact',
    optional: true,
    enabled: false
  },

  brand: {
    model: 'Brand',
    optional: true,
    enabled: false
  },

  agent: {
    model: 'Agent',
    optional: true,
    enabled: false
  }
}

Orm.register('email_campaign_recipient', 'EmailCampaignRecipient', {
  getAll,
  associations
})
