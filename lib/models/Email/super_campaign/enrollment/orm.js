const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  brand: {
    model: 'Brand',
    enabled: false
  },
  user: {
    model: 'User',
    enabled: false
  },
  campaign: {
    model: 'EmailCampaign',
    enabled: false
  }
}

Orm.register('super_campaign_enrollment', 'SuperCampaignEnrollment', {
  getAll,
  associations
})
