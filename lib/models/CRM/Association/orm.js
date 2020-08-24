const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  contact: {
    enabled: false,
    model: 'Contact'
  },
  deal: {
    enabled: false,
    model: 'Deal'
  },
  email: {
    enabled: false,
    model: 'EmailCampaign'
  },
  listing: {
    enabled: false,
    model: 'Listing'
  }
}


Orm.register('crm_association', 'CrmAssociation', {
  getAll,
  associations
})