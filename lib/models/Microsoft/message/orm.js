const Orm = require('../../Orm/registry')

const { getAll } = require('./get')


const associations = {
  campaign: {
    collection: false,
    enabled: false,
    model: 'EmailCampaign'
  }
}

Orm.register('microsoft_message', 'MicrosoftMessage', {
  getAll,
  associations
})