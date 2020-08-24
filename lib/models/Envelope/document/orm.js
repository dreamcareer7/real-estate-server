const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  pdf: {
    model: 'AttachedFile',
    optional: true
  }
}

Orm.register('envelope_document', 'EnvelopeDocument', {
  getAll,
  associations
})
