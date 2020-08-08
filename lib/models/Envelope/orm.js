const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const publicize = (envelope) => {
  if (process.env.NODE_ENV === 'tests') // Test suite needs the webhook_token :(
    return

  delete envelope.webhook_token
}

const associations = {
  recipients: {
    collection: true,
    model: 'EnvelopeRecipient'
  },

  documents: {
    collection: true,
    model: 'EnvelopeDocument'
  }
}


Orm.register('envelope', 'Envelope', {
  getAll,
  publicize,
  associations
})
