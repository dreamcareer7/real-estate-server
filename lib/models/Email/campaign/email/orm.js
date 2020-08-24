const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  email: {
    model: 'Email',
    enabled: false
  }
}


Orm.register('email_campaign_email', 'EmailCampaignEmail', {
  getAll,
  associations
})
