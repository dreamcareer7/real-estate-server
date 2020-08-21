const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  role: {
    model: 'DealRole'
  }
}

Orm.register('envelope_recipient', 'EnvelopeRecipient', {
  associations,
  getAll
})
