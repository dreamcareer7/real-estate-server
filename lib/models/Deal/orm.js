const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const publicize = deal => {
  deal.context.type = 'deal_context'
}

const associations = {
  roles: {
    collection: true,
    model: 'DealRole'
  },

  checklists: {
    collection: true,
    enabled: false,
    model: 'DealChecklist'
  },

  created_by: {
    enabled: false,
    model: 'User'
  },

  brand: {
    model: 'Brand',
    enabled: false
  },

  envelopes: {
    model: 'Envelope',
    collection: true,
    enabled: false
  },

  files: {
    collection: true,
    enabled: false,
    model: 'AttachedFile'
  },

  gallery: {
    enabled: false,
    model: 'Gallery'
  },

  triggers: {
    enabled: false,
    model: 'Trigger',
    collection: true,
  },

  property_type: {
    model: 'BrandPropertyType',
    enabled: false
  }
}

Orm.register('deal', 'Deal', {
  getAll,
  associations,
  publicize
})
